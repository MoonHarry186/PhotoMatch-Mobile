import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import * as React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { env } from '@/config/env';
import { messagingApi } from '@/features/messaging/messaging.api';
import {
  applyReceipt,
  upsertNewestMessage,
  type MessageInfiniteData,
  type MessageView,
} from '@/features/messaging/messaging.types';
import { parseRealtimeEvent } from '@/schemas/runtime-contracts';
import { accessTokenMemory } from '@/services/api/access-token';
import { queryKeys } from '@/services/api/query-keys';
import { realtimeLifecycle } from '@/services/realtime-lifecycle';
import { useSession } from './session-provider';
import { useAppState } from '@/hooks/use-app-state';
import { useNetworkStatus } from '@/hooks/use-network-status';

type RealtimeContextValue = {
  connected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendTyping: (conversationId: string, isTyping: boolean) => void;
  subscribeTyping: (
    conversationId: string,
    listener: (event: TypingEvent) => void,
  ) => () => void;
};

export type TypingEvent = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function WebSocketProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const session = useSession();
  const appState = useAppState();
  const { isOnline } = useNetworkStatus();
  const socketRef = useRef<Socket | null>(null);
  const typingListenersRef = useRef(
    new Map<string, Set<(event: TypingEvent) => void>>(),
  );
  const connectedOnce = useRef(false);
  const deliveredReceiptKeysRef = useRef(new Set<string>());
  const [connected, setConnected] = React.useState(false);
  const user = session.snapshot?.user;
  const scope = useMemo(
    () =>
      user?.currentRoleId
        ? { userId: user.id, roleId: user.currentRoleId }
        : null,
    [user],
  );

  useEffect(() => {
    const token = accessTokenMemory.get();
    if (
      !token ||
      session.gate !== 'app' ||
      !scope ||
      !isOnline ||
      appState !== 'active'
    ) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      queueMicrotask(() => setConnected(false));
      return;
    }
    const socket = io(`${env.EXPO_PUBLIC_WS_URL.replace(/\/$/, '')}/realtime`, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 8_000,
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      setConnected(true);
      if (connectedOnce.current) {
        // Reconnect có thể làm lỡ event; invalidate để đồng bộ lại conversation/messages.
        void queryClient.invalidateQueries({
          queryKey: [...baseScope(scope), 'conversations'],
        });
        void queryClient.invalidateQueries({
          queryKey: [...baseScope(scope), 'conversation'],
        });
        void queryClient.invalidateQueries({
          queryKey: [...baseScope(scope), 'matches'],
        });
        void queryClient.invalidateQueries({
          queryKey: [...baseScope(scope), 'bookings'],
        });
      }
      connectedOnce.current = true;
    });
    socket.on('disconnect', () => setConnected(false));
    socket.onAny((eventName, payload) => {
      const event = parseRealtimeEvent(eventName, payload);
      if (!event || !scope) return;
      const base = ['private', scope.userId, scope.roleId] as const;
      if (event.type === 'conversation.message.created') {
        // Payload đầy đủ thì cập nhật cache ngay, thiếu payload thì buộc refetch.
        void queryClient.invalidateQueries({
          queryKey: [...base, 'conversations'],
        });
        void queryClient.invalidateQueries({
          queryKey: [...base, 'conversation', 'detail', event.conversationId],
          exact: true,
        });
        const messagesKey = queryKeys.conversationMessages(
          scope,
          event.conversationId,
        );
        const conversationIsCached = Boolean(
          queryClient.getQueryData(messagesKey) ??
          queryClient.getQueryData(
            queryKeys.detail(scope, 'conversation', event.conversationId),
          ) ??
          queryClient.getQueryData(queryKeys.conversations(scope)),
        );
        const incomingMessage: MessageView | null =
          event.senderUserId &&
          event.clientMessageId &&
          event.messageType &&
          event.status &&
          event.sentAt
            ? {
                id: event.id,
                conversationId: event.conversationId,
                senderUserId: event.senderUserId,
                clientMessageId: event.clientMessageId,
                messageType: event.messageType,
                content: event.content,
                assetId: event.assetId,
                status: event.status,
                sentAt: event.sentAt,
              }
            : null;
        if (incomingMessage) {
          queryClient.setQueryData(
            messagesKey,
            (current: MessageInfiniteData | undefined) => {
              if (!current?.pages?.length) return current;
              return upsertNewestMessage(current, incomingMessage);
            },
          );

          // Delivered được xác nhận ngay khi thiết bị đang active và đã biết conversation.
          if (
            conversationIsCached &&
            incomingMessage.senderUserId !== scope.userId
          ) {
            const receiptKey = `${event.conversationId}:${incomingMessage.id}`;
            if (!deliveredReceiptKeysRef.current.has(receiptKey)) {
              deliveredReceiptKeysRef.current.add(receiptKey);
              void messagingApi
                .receipt(event.conversationId, incomingMessage.id, 'delivered')
                .catch(() => {
                  // Cho phép event/refetch sau thử lại nếu receipt tạm thời thất bại.
                  deliveredReceiptKeysRef.current.delete(receiptKey);
                });
            }
          }
        } else {
          void queryClient.invalidateQueries({
            queryKey: messagesKey,
          });
        }
      } else if (
        event.type === 'conversation.message.delivered' ||
        event.type === 'conversation.message.read' ||
        event.type === 'message.delivered' ||
        event.type === 'message.read'
      ) {
        // Receipt phải dùng đúng key có conversationId ở cuối, trùng với useInfiniteQuery.
        const messagesKey = queryKeys.conversationMessages(
          scope,
          event.conversationId,
        );
        const receiptType = event.type.endsWith('.read') ? 'read' : 'delivered';
        queryClient.setQueryData(
          messagesKey,
          (current: MessageInfiniteData | undefined) => {
            if (!current?.pages) return current;
            return {
              ...current,
              pages: current.pages.map((page) => ({
                ...page,
                items: applyReceipt(page.items, {
                  messageId: event.messageId,
                  type: receiptType,
                }),
              })),
            };
          },
        );
      } else if (event.type === 'conversation.typing') {
        const listeners = typingListenersRef.current.get(event.conversationId);
        for (const listener of listeners ?? []) listener(event);
      } else if (event.type === 'match.created') {
        void queryClient.invalidateQueries({ queryKey: [...base, 'matches'] });
        void queryClient.invalidateQueries({
          queryKey: [...base, 'conversations'],
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: [...base, 'bookings'] });
      }
    });
    socket.connect();
    realtimeLifecycle.registerDisconnect(() => socket.disconnect());
    return () => {
      realtimeLifecycle.registerDisconnect(null);
      socket.disconnect();
      socketRef.current = null;
      queueMicrotask(() => setConnected(false));
    };
  }, [appState, isOnline, queryClient, scope, session.gate]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation.join', { conversationId });
  }, []);
  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation.leave', { conversationId });
  }, []);
  const sendTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      socketRef.current?.emit('conversation.typing', {
        conversationId,
        isTyping,
      });
    },
    [],
  );
  const subscribeTyping = useCallback(
    (conversationId: string, listener: (event: TypingEvent) => void) => {
      const listeners =
        typingListenersRef.current.get(conversationId) ?? new Set();
      listeners.add(listener);
      typingListenersRef.current.set(conversationId, listeners);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) typingListenersRef.current.delete(conversationId);
      };
    },
    [],
  );
  const value = useMemo(
    () => ({
      connected,
      joinConversation,
      leaveConversation,
      sendTyping,
      subscribeTyping,
    }),
    [
      connected,
      joinConversation,
      leaveConversation,
      sendTyping,
      subscribeTyping,
    ],
  );
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

function baseScope(scope: { userId: string; roleId: string }) {
  return ['private', scope.userId, scope.roleId] as const;
}

export function useRealtime() {
  const value = useContext(RealtimeContext);
  if (!value)
    throw new Error('useRealtime must be used within WebSocketProvider');
  return value;
}

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
import { parseRealtimeEvent } from '@/schemas/runtime-contracts';
import { accessTokenMemory } from '@/services/api/access-token';
import { realtimeLifecycle } from '@/services/realtime-lifecycle';
import { useSession } from './session-provider';
import { useAppState } from '@/hooks/use-app-state';
import { useNetworkStatus } from '@/hooks/use-network-status';

type RealtimeContextValue = {
  connected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function WebSocketProvider({ children }: React.PropsWithChildren) {
  const queryClient = useQueryClient();
  const session = useSession();
  const appState = useAppState();
  const { isOnline } = useNetworkStatus();
  const socketRef = useRef<Socket | null>(null);
  const connectedOnce = useRef(false);
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
        void queryClient.invalidateQueries({
          queryKey: [...baseScope(scope), 'conversations'],
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
        void queryClient.invalidateQueries({
          queryKey: [...base, 'conversations'],
        });
        void queryClient.invalidateQueries({
          queryKey: [...base, 'conversation', 'detail', event.conversationId],
        });
        void queryClient.invalidateQueries({
          queryKey: [
            ...base,
            'conversation',
            'detail',
            event.conversationId,
            'messages',
          ],
        });
      } else if (
        event.type === 'conversation.message.delivered' ||
        event.type === 'conversation.message.read' ||
        event.type === 'message.delivered' ||
        event.type === 'message.read'
      ) {
        void queryClient.invalidateQueries({
          queryKey: [
            ...base,
            'conversation',
            'detail',
            event.conversationId,
            'messages',
          ],
        });
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
  const value = useMemo(
    () => ({ connected, joinConversation, leaveConversation }),
    [connected, joinConversation, leaveConversation],
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

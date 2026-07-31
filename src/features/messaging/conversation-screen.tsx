import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { normalizeError } from '@/core/errors';
import { createSubmissionKey } from '@/services/api/idempotency';
import { getSignedAssetUrl } from '@/services/media/signed-url-cache';
import { uploadMedia } from '@/services/media/upload';
import { queryKeys } from '@/services/api/query-keys';
import { colors, spacing, typography } from '@/theme';
import { useRealtime } from '@/providers/websocket-provider';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { profileApi } from '@/features/profile/profile.api';

import { ChatBubble } from './chat-bubble';
import { messagingApi } from './messaging.api';
import { reconcileMessages, type MessageView } from './messaging.types';

export function ConversationScreen({
  conversationId,
  scope,
}: {
  conversationId: string;
  scope: { userId: string; roleId: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const realtime = useRealtime();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const keys = queryKeys.detail(scope, 'conversation', conversationId);
  const messagesKey = [...keys, 'messages', conversationId] as const;
  const conversation = useQuery({
    queryKey: keys,
    queryFn: ({ signal }) => messagingApi.conversation(conversationId, signal),
  });
  const match = useQuery({
    queryKey: queryKeys.match(
      scope,
      conversation.data?.matchId ?? conversationId,
    ),
    queryFn: ({ signal }) =>
      discoveryApi.match(conversation.data!.matchId, signal),
    enabled: Boolean(conversation.data?.matchId),
  });
  const counterpartProfile = useQuery({
    queryKey: queryKeys.publicProfile(match.data?.counterpart.userRoleId ?? ''),
    queryFn: () => profileApi.publicProfile(match.data!.counterpart.userRoleId),
    enabled: match.data?.counterpart.role === 'PHOTOGRAPHER',
  });
  const history = useInfiniteQuery({
    queryKey: messagesKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      messagingApi.messages(conversationId, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor,
  });
  const messages = useMemo(
    () =>
      reconcileMessages(
        [],
        history.data?.pages.flatMap((page) => page.items) ?? [],
      ),
    [history.data],
  );
  const draftKeys = useRef(new Map<string, string>());
  const receiptKeys = useRef(new Set<string>());
  useEffect(() => {
    if (!conversation.data || conversation.data.status !== 'ACTIVE') return;
    const incoming = messages.filter(
      (message) => message.senderUserId !== scope.userId && message.id,
    );
    for (const message of incoming) {
      const key = `${message.id}:read`;
      if (receiptKeys.current.has(key)) continue;
      receiptKeys.current.add(key);
      void messagingApi
        .receipt(conversationId, message.id, 'read')
        .catch(() => {
          receiptKeys.current.delete(key);
        });
    }
  }, [conversation.data, conversationId, messages, scope.userId]);
  useEffect(() => {
    realtime.joinConversation(conversationId);
    return () => realtime.leaveConversation(conversationId);
  }, [conversationId, realtime]);
  const send = useMutation({
    mutationFn: async ({
      clientMessageId,
      content,
    }: {
      clientMessageId: string;
      content: string;
    }) =>
      messagingApi.send(conversationId, {
        clientMessageId,
        messageType: 'TEXT',
        content,
      }),
    onMutate: async ({ clientMessageId, content }) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const optimistic: MessageView = {
        id: `local-${clientMessageId}`,
        conversationId,
        senderUserId: scope.userId,
        clientMessageId,
        messageType: 'TEXT',
        content,
        status: 'SENT',
        sentAt: new Date().toISOString(),
        localStatus: 'sending',
      };
      queryClient.setQueryData(
        messagesKey,
        (value: unknown) =>
          value ?? {
            pages: [{ items: [optimistic] }],
            pageParams: [undefined],
          },
      );
      return { optimistic };
    },
    onSuccess: async (value, input) => {
      queryClient.setQueryData(
        messagesKey,
        (current: { pages?: { items: MessageView[] }[] } | undefined) => {
          if (!current?.pages) return current;
          const items = reconcileMessages(
            current.pages.flatMap((page) => page.items),
            [value],
          );
          return { pages: [{ items }], pageParams: [undefined] };
        },
      );
      draftKeys.current.delete(input.clientMessageId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(scope),
      });
    },
    onError: (_, input) => {
      queryClient.setQueryData(
        messagesKey,
        (current: { pages?: { items: MessageView[] }[] } | undefined) => {
          if (!current?.pages) return current;
          return {
            pages: current.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.clientMessageId === input.clientMessageId
                  ? { ...item, localStatus: 'failed', status: 'FAILED' }
                  : item,
              ),
            })),
          };
        },
      );
    },
  });

  if (conversation.isPending || history.isPending)
    return <LoadingState label="Đang tải cuộc trò chuyện…" />;
  if (conversation.isError || history.isError)
    return (
      <ErrorState
        title="Không thể tải cuộc trò chuyện"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() =>
          void Promise.all([conversation.refetch(), history.refetch()])
        }
      />
    );
  if (!conversation.data)
    return <EmptyState title="Cuộc trò chuyện không khả dụng" />;
  const closed = conversation.data.status !== 'ACTIVE';
  const submit = () => {
    const content = text.trim();
    if (!content || send.isPending || closed) return;
    const clientMessageId =
      draftKeys.current.get(content) ?? createSubmissionKey().current();
    draftKeys.current.set(content, clientMessageId);
    setText('');
    send.mutate({ clientMessageId, content });
  };
  const uploadAttachment = async (
    purpose: 'CHAT_IMAGE' | 'CHAT_FILE',
    asset: {
      uri: string;
      fileName?: string | null;
      mimeType?: string | null;
      fileSize?: number | null;
    },
  ) => {
    try {
      setError(null);
      const completed = await uploadMedia(purpose, asset);
      await getSignedAssetUrl(completed.id);
      const clientMessageId = createSubmissionKey().current();
      await messagingApi.send(conversationId, {
        clientMessageId,
        messageType: purpose === 'CHAT_IMAGE' ? 'IMAGE' : 'FILE',
        assetId: completed.id,
      });
      await history.refetch();
    } catch (caught) {
      setError(normalizeError(caught).message);
    }
  };
  return (
    <AppScreen
      scroll={false}
      header={
        <View style={styles.header}>
          <Button
            label="Quay lại"
            variant="ghost"
            onPress={() => router.back()}
          />
          <Text style={styles.title}>Tin nhắn</Text>
          {conversation.data?.status === 'ACTIVE' &&
          match.data?.counterpart.role === 'PHOTOGRAPHER' &&
          counterpartProfile.data?.services[0] ? (
            <Button
              label="Đặt lịch"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/(details)/booking/create',
                  params: {
                    photographerRoleId: match.data!.counterpart.userRoleId,
                    serviceId: counterpartProfile.data?.services[0]?.id ?? '',
                    conversationId,
                  },
                })
              }
            />
          ) : null}
        </View>
      }
      footer={
        <View style={styles.composer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {closed ? (
            <Text style={styles.closed}>
              Cuộc trò chuyện đã đóng. Lịch sử vẫn được giữ lại.
            </Text>
          ) : null}
          <TextField
            label="Tin nhắn"
            value={text}
            onChangeText={setText}
            placeholder="Viết tin nhắn…"
            editable={!closed}
            onSubmitEditing={submit}
            returnKeyType="send"
          />
          <View style={styles.actions}>
            <Button
              label="Gửi ảnh"
              variant="secondary"
              disabled={closed}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                });
                const asset = result.assets?.[0];
                if (!result.canceled && asset)
                  await uploadAttachment('CHAT_IMAGE', asset);
              }}
            />
            <Button
              label="Gửi tệp"
              variant="secondary"
              disabled={closed}
              onPress={async () => {
                const result = await DocumentPicker.getDocumentAsync({
                  copyToCacheDirectory: true,
                });
                if (!result.canceled && result.assets[0])
                  await uploadAttachment('CHAT_FILE', result.assets[0]);
              }}
            />
            <Button
              label="Gửi"
              disabled={closed || !text.trim()}
              loading={send.isPending}
              onPress={submit}
            />
          </View>
        </View>
      }
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id || item.clientMessageId}
        contentContainerStyle={styles.messages}
        onEndReached={() => {
          if (history.hasNextPage) void history.fetchNextPage();
        }}
        renderItem={({ item }) => (
          <ChatBubble
            message={item}
            onRetry={() => {
              if (item.content)
                send.mutate({
                  clientMessageId: item.clientMessageId,
                  content: item.content,
                });
            }}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="Chưa có tin nhắn"
            message="Hãy bắt đầu cuộc trò chuyện."
          />
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  messages: { flexGrow: 1, gap: spacing.md, padding: spacing.md },
  composer: {
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  actions: { flexDirection: 'row', gap: spacing.xs },
  error: { color: colors.light.error },
  closed: { color: colors.light.muted, fontSize: 13 },
});

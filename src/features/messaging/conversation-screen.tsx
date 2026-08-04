import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { normalizeError } from '@/core/errors';
import { createSubmissionKey } from '@/services/api/idempotency';
import { getSignedAssetUrl } from '@/services/media/signed-url-cache';
import { uploadMedia } from '@/services/media/upload';
import { queryKeys } from '@/services/api/query-keys';
import { colors, gradients, radius, spacing, typography } from '@/theme';
import { useRealtime } from '@/providers/websocket-provider';
import { useTheme } from '@/providers/theme-provider';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { profileApi } from '@/features/profile/profile.api';

import { ChatBubble } from './chat-bubble';
import { messagingApi } from './messaging.api';
import { reconcileMessages, type MessageView } from './messaging.types';

type Palette = typeof colors.light | typeof colors.dark;

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
  const theme = useTheme();
  const palette = theme.resolved === 'dark' ? colors.dark : colors.light;
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
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
  const listRef = useRef<FlatList<MessageView>>(null);
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
      contentStyle={styles.screenContent}
      header={
        <View style={[styles.header, { backgroundColor: palette.background }]}>
          <HeaderIcon
            icon={{
              ios: 'chevron.left',
              android: 'arrow_back',
              web: 'arrow_back',
            }}
            label="Quay lại"
            onPress={() => router.back()}
          />
          <ConversationHeader
            displayName={
              match.data?.counterpart.displayName ?? 'Cuộc trò chuyện'
            }
            avatarAssetId={match.data?.counterpart.avatarAssetId}
            active={conversation.data.status === 'ACTIVE'}
            palette={palette}
          />
          {conversation.data?.status === 'ACTIVE' &&
          match.data?.counterpart.role === 'PHOTOGRAPHER' &&
          counterpartProfile.data?.services[0] ? (
            <HeaderIcon
              icon={{ ios: 'calendar', android: 'event', web: 'event' }}
              label="Đặt lịch chụp"
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
        <View
          style={[
            styles.composer,
            {
              backgroundColor: palette.background,
              borderTopColor: palette.border,
            },
          ]}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {closed ? (
            <Text style={styles.closed}>
              Cuộc trò chuyện đã đóng. Lịch sử vẫn được giữ lại.
            </Text>
          ) : null}
          {showAttachments ? (
            <View style={styles.attachmentMenu}>
              <Button
                label="Ảnh"
                variant="secondary"
                disabled={closed}
                onPress={async () => {
                  setShowAttachments(false);
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                  });
                  const asset = result.assets?.[0];
                  if (!result.canceled && asset)
                    await uploadAttachment('CHAT_IMAGE', asset);
                }}
              />
              <Button
                label="Tệp"
                variant="secondary"
                disabled={closed}
                onPress={async () => {
                  setShowAttachments(false);
                  const result = await DocumentPicker.getDocumentAsync({
                    copyToCacheDirectory: true,
                  });
                  if (!result.canceled && result.assets[0])
                    await uploadAttachment('CHAT_FILE', result.assets[0]);
                }}
              />
            </View>
          ) : null}
          <View style={styles.composerLine}>
            <View
              style={[
                styles.composerRow,
                {
                  backgroundColor: palette.surfaceVariant,
                  borderColor: palette.border,
                },
              ]}
            >
              <HeaderIcon
                icon={{
                  ios: 'face.smiling',
                  android: 'emoji_emotions',
                  web: 'sentiment_satisfied',
                }}
                label="Thêm biểu tượng cảm xúc"
                tintColor={palette.muted}
                onPress={() => undefined}
              />
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type a message..."
                placeholderTextColor={palette.muted}
                editable={!closed}
                onSubmitEditing={submit}
                returnKeyType="send"
                style={[styles.input, { color: palette.text }]}
                accessibilityLabel="Tin nhắn"
              />
              <HeaderIcon
                icon={{
                  ios: 'paperclip',
                  android: 'attach_file',
                  web: 'attach_file',
                }}
                label="Đính kèm ảnh hoặc tệp"
                tintColor={palette.muted}
                onPress={() => setShowAttachments((value) => !value)}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Gửi tin nhắn"
              disabled={closed || !text.trim() || send.isPending}
              onPress={submit}
              style={({ pressed }) => [
                styles.sendButton,
                (pressed || closed || !text.trim()) && styles.sendDisabled,
              ]}
            >
              <LinearGradient
                colors={gradients.brand}
                style={styles.sendGradient}
              >
                <SymbolView
                  name={{
                    ios: 'paperplane.fill',
                    android: 'send',
                    web: 'send',
                  }}
                  size={23}
                  tintColor="#FFFFFF"
                />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      }
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id || item.clientMessageId}
        contentContainerStyle={[
          styles.messages,
          { backgroundColor: palette.background },
        ]}
        ListHeaderComponent={
          <DateSeparator label="Hôm nay" palette={palette} />
        }
        onContentSizeChange={() =>
          requestAnimationFrame(() =>
            listRef.current?.scrollToEnd({ animated: false }),
          )
        }
        onEndReached={() => {
          if (history.hasNextPage) void history.fetchNextPage();
        }}
        renderItem={({ item }) => (
          <ChatBubble
            message={item}
            isMine={item.senderUserId === scope.userId}
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
  screenContent: { padding: 0, gap: 0 },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerActions: { flexDirection: 'row', marginLeft: 'auto' },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  headerIdentity: { flexDirection: 'row', alignItems: 'center' },
  headerCopy: { flex: 1, gap: 1, marginLeft: spacing.xs },
  headerName: { fontFamily: typography.medium, fontSize: 16 },
  headerStatus: {
    color: colors.success,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  avatarImage: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    color: '#FFFFFF',
    fontFamily: typography.bold,
    fontSize: 16,
  },
  onlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    right: -1,
    bottom: -1,
    borderRadius: 6,
    backgroundColor: '#44DFAB',
    borderWidth: 2,
  },
  messages: {
    flexGrow: 1,
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dateSeparator: {
    alignSelf: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginVertical: spacing.md,
  },
  dateText: { fontFamily: typography.medium, fontSize: 12 },
  composer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
  },
  attachmentMenu: { flexDirection: 'row', gap: spacing.sm },
  composerLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  composerRow: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xs,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    fontFamily: typography.regular,
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.45 },
  error: { color: colors.light.error, fontSize: 12 },
  closed: { color: colors.light.muted, fontSize: 13 },
});

function HeaderIcon({
  icon,
  label,
  onPress,
  tintColor = colors.brand,
}: {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
  tintColor?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={styles.iconButton}
    >
      <SymbolView name={icon} size={24} tintColor={tintColor} />
    </Pressable>
  );
}

function DateSeparator({
  label,
  palette,
}: {
  label: string;
  palette: Palette;
}) {
  return (
    <View
      style={[
        styles.dateSeparator,
        { backgroundColor: palette.surfaceVariant },
      ]}
    >
      <Text style={[styles.dateText, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

function ConversationHeader({
  displayName,
  avatarAssetId,
  active,
  palette,
}: {
  displayName: string;
  avatarAssetId?: string | null;
  active: boolean;
  palette: Palette;
}) {
  const avatar = useQuery({
    queryKey: ['signed-conversation-avatar', avatarAssetId],
    queryFn: () => getSignedAssetUrl(avatarAssetId!),
    enabled: Boolean(avatarAssetId),
  });
  return (
    <View style={styles.headerCopy}>
      <View style={styles.headerIdentity}>
        <View style={[styles.avatar, { backgroundColor: colors.brand }]}>
          {avatar.data ? (
            <Image
              source={{ uri: avatar.data }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.avatarFallback}>
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
          )}
          {active ? (
            <View
              style={[styles.onlineDot, { borderColor: palette.background }]}
            />
          ) : null}
        </View>
        <View style={styles.headerCopy}>
          <Text
            numberOfLines={1}
            style={[styles.headerName, { color: palette.text }]}
          >
            {displayName}
          </Text>
          <Text style={styles.headerStatus}>
            {active ? 'Active now' : 'Offline'}
          </Text>
        </View>
      </View>
    </View>
  );
}

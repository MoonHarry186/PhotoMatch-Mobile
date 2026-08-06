import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ComponentProps,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { EmptyState, ErrorState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { createSubmissionKey } from '@/services/api/idempotency';
import { getSignedAssetUrl } from '@/services/media/signed-url-cache';
import { queryKeys } from '@/services/api/query-keys';
import { colors, gradients, radius, spacing, typography } from '@/theme';
import { useRealtime } from '@/providers/websocket-provider';
import { useTheme } from '@/providers/theme-provider';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { profileApi } from '@/features/profile/profile.api';
import { useI18n } from '@/i18n/i18n-provider';

import { ChatBubble, MessageBubbleRow } from './chat-bubble';
import {
  buildMessageRows,
  type MessageListRow,
} from './conversation-screen.logic';
import { messagingApi } from './messaging.api';
import {
  getMessageIdentity,
  markMessageFailed,
  reconcileMessages,
  upsertNewestMessage,
  type ConversationSummary,
  type MessageInfiniteData,
  type MessageView,
} from './messaging.types';
import { conversationMessagesOptions } from './messaging.queries';

type Palette = typeof colors.light | typeof colors.dark;

// Sau mỗi lần chạm vùng lịch sử, người dùng phải rời vùng đó rồi mới tải trang kế tiếp.
const HISTORY_REARM_THRESHOLD = 96;
// Tin nhắn mới chỉ tự cuộn nếu người dùng đang ở gần cuối cuộc trò chuyện.
const LATEST_SCROLL_THRESHOLD = 96;
const ONE_LINE_MESSAGE_HEIGHT = 48;

type ConversationScreenProps = {
  conversationId: string;
  scope: { userId: string; roleId: string };
  initialSummary?: ConversationSummary;
};

export function ConversationScreen(props: ConversationScreenProps) {
  const { conversationId, scope } = props;
  // Đổi key để reset toàn bộ state/ref khi chuyển hội thoại hoặc đổi role.
  return (
    <ConversationScreenContent
      key={`${scope.userId}:${scope.roleId}:${conversationId}`}
      {...props}
    />
  );
}

function ConversationScreenContent({
  conversationId,
  scope,
  initialSummary,
}: ConversationScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const realtime = useRealtime();
  const { locale, t } = useI18n();
  const theme = useTheme();
  const palette = theme.resolved === 'dark' ? colors.dark : colors.light;
  const scrollButtonPalette =
    theme.resolved === 'dark'
      ? { background: '#000000', foreground: '#FFFFFF' }
      : { background: '#FFFFFF', foreground: '#000000' };
  const [text, setText] = useState('');
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const [nearLatestForRender, setNearLatestForRender] = useState(true);
  const keys = queryKeys.detail(scope, 'conversation', conversationId);
  const messagesKey = queryKeys.conversationMessages(scope, conversationId);
  const conversation = useQuery({
    queryKey: keys,
    queryFn: ({ signal }) => messagingApi.conversation(conversationId, signal),
  });
  const matchId = conversation.data?.matchId ?? initialSummary?.matchId;
  const match = useQuery({
    queryKey: queryKeys.match(scope, matchId ?? conversationId),
    queryFn: ({ signal }) => discoveryApi.match(matchId!, signal),
    enabled: Boolean(matchId),
  });
  const counterpartProfile = useQuery({
    queryKey: queryKeys.publicProfile(match.data?.counterpart.userRoleId ?? ''),
    queryFn: () => profileApi.publicProfile(match.data!.counterpart.userRoleId),
    enabled: match.data?.counterpart.role === 'PHOTOGRAPHER',
  });
  const history = useInfiniteQuery(
    conversationMessagesOptions(scope, conversationId),
  );
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } =
    history;
  const messages = useMemo(
    () =>
      // Các trang đang theo thứ tự mới -> cũ nên cần hợp nhất rồi sắp xếp lại.
      reconcileMessages(
        [],
        history.data?.pages.flatMap((page) => page.items) ?? [],
      ),
    [history.data],
  );
  const messageRows = useMemo(
    // Chèn date separator trước khi đưa dữ liệu vào FlatList.
    () => buildMessageRows(messages, locale, t),
    [locale, messages, t],
  );
  const invertedMessageRows = useMemo(
    () => [...messageRows].reverse(),
    [messageRows],
  );
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<MessageListRow>>(null);
  const textRef = useRef('');
  // Các ref này tránh tạo lại timer/flag theo mỗi lần render.
  const loadingOlderMessages = useRef(false);
  const olderMessagesLoadBlocked = useRef(false);
  const userHasScrolled = useRef(false);
  const isNearLatest = useRef(true);
  const previousMessageIdentities = useRef<Set<string> | null>(null);
  const receiptKeys = useRef(new Set<string>());
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const previousCounterpartTyping = useRef(false);
  const typingActive = useRef(false);
  const [counterpartTyping, setCounterpartTyping] = useState(false);
  const scrollToLatest = useCallback((animated: boolean) => {
    setShowScrollToLatest(false);
    listRef.current?.scrollToOffset({
      offset: 0,
      animated,
    });
  }, []);
  const scrollForUserMessage = useCallback(() => {
    scrollToLatest(true);
  }, [scrollToLatest]);

  useEffect(() => {
    if (!history.data) return;
    // So sánh identity thay vì độ dài vì ACK HTTP có thể thay tin local bằng tin server.
    const identities = new Set(messages.map(getMessageIdentity));
    const previous = previousMessageIdentities.current;

    if (previous) {
      const hasNewMessage = [...identities].some(
        (identity) => !previous.has(identity),
      );
      if (hasNewMessage && isNearLatest.current) scrollToLatest(true);
    }

    previousMessageIdentities.current = identities;
  }, [history.data, messages, scrollToLatest]);

  useEffect(() => {
    if (!conversation.data) return;
    // Mỗi message chỉ gửi receipt một lần trong vòng đời màn hình.
    const incoming = messages.filter(
      (message) => message.senderUserId !== scope.userId && message.id,
    );
    let cancelled = false;
    void (async () => {
      for (const message of incoming) {
        // Không tiếp tục cập nhật receipt sau khi đổi màn hình/hội thoại.
        if (cancelled) return;
        const key = `${message.id}:read`;
        if (receiptKeys.current.has(key)) continue;
        receiptKeys.current.add(key);
        try {
          await messagingApi.receipt(conversationId, message.id, 'read');
        } catch {
          receiptKeys.current.delete(key);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversation.data, conversationId, messages, scope.userId]);
  useEffect(() => {
    // Join room để nhận message, receipt và typing của đúng hội thoại hiện tại.
    realtime.joinConversation(conversationId);
    return () => realtime.leaveConversation(conversationId);
  }, [conversationId, realtime]);
  useEffect(() => {
    // Subscription được hủy khi đổi hội thoại để không hiển thị typing của room cũ.
    return realtime.subscribeTyping(conversationId, (event) => {
      if (event.userId === scope.userId) return;
      if (typingIndicatorTimer.current)
        clearTimeout(typingIndicatorTimer.current);
      setCounterpartTyping(event.isTyping);
    });
  }, [conversationId, realtime, scope.userId]);
  useEffect(() => {
    const startedTyping =
      counterpartTyping && !previousCounterpartTyping.current;
    if (startedTyping && isNearLatest.current) scrollToLatest(true);
    previousCounterpartTyping.current = counterpartTyping;
  }, [counterpartTyping, scrollToLatest]);
  useEffect(
    () => () => {
      // Dọn timer và phát tín hiệu stop typing khi rời màn hình.
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (typingIndicatorTimer.current)
        clearTimeout(typingIndicatorTimer.current);
      if (typingActive.current) {
        realtime.sendTyping(conversationId, false);
        typingActive.current = false;
      }
    },
    [conversationId, realtime],
  );
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
      const hadMessageData = Boolean(
        queryClient.getQueryData<MessageInfiniteData>(messagesKey),
      );
      await queryClient.cancelQueries({ queryKey: messagesKey });
      // Hiển thị ngay tin nhắn local; helper giữ nguyên pageParams/cursor.
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
      queryClient.setQueryData<MessageInfiniteData | undefined>(
        messagesKey,
        (current) => upsertNewestMessage(current, optimistic),
      );
      return { optimistic, hadMessageData };
    },
    onSuccess: async (value, _variables, context) => {
      // ACK HTTP và event realtime có thể cùng đến, helper sẽ hợp nhất theo ID.
      queryClient.setQueryData<MessageInfiniteData | undefined>(
        messagesKey,
        (current) => upsertNewestMessage(current, value),
      );
      if (!context?.hadMessageData) {
        await queryClient.invalidateQueries({ queryKey: messagesKey });
      }
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(scope),
      });
    },
    onError: (_, input, context) => {
      // Giữ message failed để người dùng có thể retry, không làm hỏng cache phân trang.
      queryClient.setQueryData<MessageInfiniteData | undefined>(
        messagesKey,
        (current) => markMessageFailed(current, input.clientMessageId),
      );
      if (!context?.hadMessageData)
        void queryClient.invalidateQueries({ queryKey: messagesKey });
    },
  });
  const nextCursor = history.data?.pages.at(-1)?.nextCursor;
  const loadOlderMessages = useCallback(() => {
    // Chỉ dùng nextCursor của trang cũ nhất; các guard ngăn request trùng nhau.
    if (
      loadingOlderMessages.current ||
      olderMessagesLoadBlocked.current ||
      !hasNextPage ||
      !nextCursor ||
      isFetchingNextPage ||
      isRefetching
    ) {
      return;
    }

    loadingOlderMessages.current = true;
    void fetchNextPage()
      .then((result) => {
        if (
          result.isFetchNextPageError ||
          !result.data?.pages.at(-1)?.items.length
        ) {
          olderMessagesLoadBlocked.current = true;
        }
      })
      .catch(() => {
        olderMessagesLoadBlocked.current = true;
      })
      .finally(() => {
        loadingOlderMessages.current = false;
        // Chờ người dùng rời vùng lịch sử rồi quay lại để tải trang kế tiếp.
        olderMessagesLoadBlocked.current = true;
      });
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
    nextCursor,
  ]);
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      const distanceFromLatest = Math.max(0, contentOffset.y);
      const nearLatest = distanceFromLatest <= LATEST_SCROLL_THRESHOLD;
      if (isNearLatest.current !== nearLatest) {
        isNearLatest.current = nearLatest;
        setNearLatestForRender(nearLatest);
      }
      setShowScrollToLatest((visible) => {
        const nextVisible = !nearLatest;
        return visible === nextVisible ? visible : nextVisible;
      });

      const historyEndOffset = Math.max(
        0,
        contentSize.height - layoutMeasurement.height,
      );
      const distanceFromHistoryEnd = Math.max(
        0,
        historyEndOffset - contentOffset.y,
      );
      if (distanceFromHistoryEnd > HISTORY_REARM_THRESHOLD)
        olderMessagesLoadBlocked.current = false;
    },
    [],
  );
  const handleEndReached = useCallback(() => {
    if (!userHasScrolled.current) return;
    loadOlderMessages();
  }, [loadOlderMessages]);
  const retryOlderMessages = useCallback(() => {
    olderMessagesLoadBlocked.current = false;
    loadOlderMessages();
  }, [loadOlderMessages]);

  const hasConversationData = Boolean(conversation.data);
  const hasHistoryData = Boolean(history.data?.pages.length);
  const isInitialMessagesLoading = history.isPending && !hasHistoryData;
  const isRefreshingMessages =
    history.isFetching && !history.isFetchingNextPage && hasHistoryData;
  const hasConversationFallback =
    hasConversationData || hasHistoryData || Boolean(initialSummary);
  if (conversation.isError && !hasConversationFallback)
    return (
      <ErrorState
        title={t('messaging.loadError')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => {
          const retryHistory = hasHistoryData
            ? Promise.resolve()
            : history.refetch();
          void Promise.all([conversation.refetch(), retryHistory]);
        }}
      />
    );
  const resolvedStatus = conversation.data?.status ?? initialSummary?.status;
  const closed = resolvedStatus !== 'ACTIVE';
  const statusKnown = Boolean(resolvedStatus);
  // ACTIVE là trạng thái của conversation, không phải presence online của đối phương.
  const conversationStatusLabel =
    resolvedStatus === 'ACTIVE'
      ? t('messaging.statusActive')
      : resolvedStatus === 'BLOCKED'
        ? t('messaging.statusBlocked')
        : resolvedStatus === 'CLOSED'
          ? t('messaging.statusClosed')
          : t('messaging.loading');
  const unavailableMessage =
    resolvedStatus === 'BLOCKED'
      ? t('messaging.blocked')
      : t('messaging.closed');
  const stopTyping = () => {
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (typingActive.current) {
      realtime.sendTyping(conversationId, false);
      typingActive.current = false;
    }
  };
  const handleTextChange = (value: string) => {
    // Ref giữ draft mới nhất để double-tap nút gửi không gửi lại draft cũ trước render kế tiếp.
    textRef.current = value;
    setText(value);
    if (!value.trim() || closed) {
      stopTyping();
      return;
    }
    if (!typingActive.current) {
      realtime.sendTyping(conversationId, true);
      typingActive.current = true;
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(stopTyping, 1_500);
  };
  const retryMessage = (message: MessageView) => {
    if (!message.content) return;
    scrollForUserMessage();
    send.mutate({
      clientMessageId: message.clientMessageId,
      content: message.content,
    });
  };
  const submit = () => {
    const content = textRef.current.trim();
    if (!content || closed) return;
    // Xóa ref trước khi mutate để lần nhấn kế tiếp không tạo message trùng.
    textRef.current = '';
    stopTyping();
    const clientMessageId = createSubmissionKey().current();
    scrollForUserMessage();
    setText('');
    requestAnimationFrame(() => inputRef.current?.focus());
    send.mutate({ clientMessageId, content });
  };
  const messageListEmpty = isInitialMessagesLoading ? (
    <ConversationMessagesSkeleton
      label={t('messaging.loading')}
      palette={palette}
    />
  ) : history.isError && !hasHistoryData ? (
    <MessageListError
      message={t('messaging.loadError')}
      retryLabel={t('common.retry')}
      onRetry={() => void history.refetch()}
      palette={palette}
    />
  ) : (
    <EmptyState
      title={t('messaging.noMessages')}
      message={t('messaging.startConversation')}
    />
  );
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
            label={t('messaging.back')}
            onPress={() => router.back()}
          />
          <ConversationHeader
            displayName={
              match.data?.counterpart.displayName ||
              initialSummary?.displayName ||
              t('messaging.conversationTitle')
            }
            avatarAssetId={
              match.data?.counterpart.avatarAssetId ??
              initialSummary?.avatarAssetId
            }
            active={resolvedStatus === 'ACTIVE'}
            palette={palette}
            statusLabel={conversationStatusLabel}
          />
          {resolvedStatus === 'ACTIVE' &&
          match.data?.counterpart.role === 'PHOTOGRAPHER' &&
          counterpartProfile.data?.services[0] ? (
            <HeaderIcon
              icon={{ ios: 'calendar', android: 'event', web: 'event' }}
              label={t('messaging.booking')}
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
          {statusKnown && closed ? (
            <Text style={[styles.closed, { color: palette.muted }]}>
              {unavailableMessage}
            </Text>
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
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={handleTextChange}
                placeholder={t('messaging.placeholder')}
                placeholderTextColor={palette.muted}
                editable={!closed}
                maxLength={5_000}
                onSubmitEditing={submit}
                returnKeyType="send"
                style={[styles.input, { color: palette.text }]}
                accessibilityLabel={t('messaging.placeholder')}
              />
            </View>
            <LinearGradient colors={gradients.brand} style={styles.sendButton}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('messaging.send')}
                accessibilityState={{
                  disabled: closed || !text.trim(),
                  busy: send.isPending,
                }}
                disabled={closed || !text.trim()}
                hitSlop={8}
                onPress={submit}
                style={({ pressed }) => [
                  styles.sendPressable,
                  (pressed || closed || !text.trim()) && styles.sendDisabled,
                ]}
              >
                <SymbolView
                  name={{
                    ios: 'paperplane.fill',
                    android: 'send',
                    web: 'send',
                  }}
                  size={23}
                  tintColor={colors.onBrand}
                  pointerEvents="none"
                />
              </Pressable>
            </LinearGradient>
          </View>
        </View>
      }
    >
      <View style={styles.listContainer}>
        <FlatList
          ref={listRef}
          data={invertedMessageRows}
          inverted
          style={styles.messageList}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[
            styles.messages,
            { backgroundColor: palette.background },
          ]}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 32,
          }}
          onScrollBeginDrag={() => {
            userHasScrolled.current = true;
          }}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.2}
          renderItem={({ item }) =>
            item.kind === 'date' ? (
              <DateSeparator label={item.label} palette={palette} />
            ) : (
              <ChatBubble
                message={item.message}
                isMine={item.message.senderUserId === scope.userId}
                onRetry={() => retryMessage(item.message)}
              />
            )
          }
          ListFooterComponent={
            history.isFetchNextPageError ? (
              <View style={styles.historyFooter}>
                <Text
                  style={[styles.historyFooterText, { color: palette.muted }]}
                >
                  {t('messaging.loadOlderError')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('messaging.retryLoadOlder')}
                  onPress={retryOlderMessages}
                  style={styles.historyRetry}
                >
                  <Text
                    style={[styles.historyRetryText, { color: colors.brand }]}
                  >
                    {t('messaging.retryLoadOlder')}
                  </Text>
                </Pressable>
              </View>
            ) : isFetchingNextPage ? (
              <View style={styles.historyFooter}>
                <ActivityIndicator
                  accessibilityLabel={t('messaging.loading')}
                  color={palette.muted}
                />
              </View>
            ) : null
          }
          ListHeaderComponent={
            counterpartTyping && nearLatestForRender ? (
              <View style={styles.latestListHeader}>
                <MessageBubbleRow isMine={false}>
                  <TypingIndicator
                    accessibilityLabel={t('messaging.typing')}
                    palette={palette}
                  />
                </MessageBubbleRow>
              </View>
            ) : null
          }
          ListEmptyComponent={messageListEmpty}
        />
        {isRefreshingMessages ? (
          <View pointerEvents="none" style={styles.refreshIndicator}>
            <ActivityIndicator
              accessibilityLabel={t('messaging.loading')}
              color={palette.muted}
            />
          </View>
        ) : null}
        {counterpartTyping && !nearLatestForRender ? (
          <View pointerEvents="none" style={styles.floatingTypingRow}>
            <MessageBubbleRow isMine={false}>
              <TypingIndicator
                accessibilityLabel={t('messaging.typing')}
                palette={palette}
              />
            </MessageBubbleRow>
          </View>
        ) : null}
        {showScrollToLatest ? (
          <View
            style={[
              styles.scrollToLatestButton,
              {
                backgroundColor: scrollButtonPalette.background,
                borderColor: scrollButtonPalette.foreground,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('messaging.scrollToBottom')}
              onPress={() => {
                scrollToLatest(true);
              }}
              style={({ pressed }) => [
                styles.scrollToLatestPressable,
                { opacity: pressed ? 0.78 : 1 },
              ]}
            >
              <SymbolView
                name={{
                  ios: 'arrow.down',
                  android: 'arrow_downward',
                  web: 'arrow_downward',
                }}
                size={24}
                tintColor={scrollButtonPalette.foreground}
              />
            </Pressable>
          </View>
        ) : null}
      </View>
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
    shadowColor: colors.dark.text,
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
    borderRadius: radius.md,
  },
  headerIdentity: { flexDirection: 'row', alignItems: 'center' },
  headerCopy: { flex: 1, gap: 1, marginLeft: spacing.xs },
  headerName: { fontFamily: typography.medium, fontSize: 16 },
  headerStatus: {
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
    fontFamily: typography.bold,
    fontSize: 16,
  },
  messages: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  historyFooter: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  historyFooterText: {
    fontFamily: typography.regular,
    fontSize: 13,
    textAlign: 'center',
  },
  historyRetry: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  historyRetryText: {
    fontFamily: typography.medium,
    fontSize: 14,
  },
  messagesInlineState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  messagesInlineStateText: {
    fontFamily: typography.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  messagesInlineStateAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  messagesInlineStateActionText: {
    fontFamily: typography.medium,
    fontSize: 14,
  },
  messagesSkeleton: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    gap: spacing.md,
    padding: spacing.lg,
  },
  messagesSkeletonBubble: {
    height: 48,
    borderRadius: radius.lg,
  },
  messagesSkeletonIncoming: {
    alignSelf: 'flex-start',
    width: '64%',
  },
  messagesSkeletonOutgoing: {
    alignSelf: 'flex-end',
    width: '76%',
  },
  latestListHeader: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  refreshIndicator: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.lg,
    zIndex: 2,
  },
  messageList: { flex: 1, minHeight: 0 },
  listContainer: { flex: 1, minHeight: 0, position: 'relative' },
  scrollToLatestButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    shadowColor: colors.dark.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 2,
  },
  scrollToLatestPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
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
    flexShrink: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  composerLine: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  composerRow: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xs,
    shadowColor: colors.dark.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingHorizontal: spacing.xs,
    fontFamily: typography.regular,
    fontSize: 16,
  },
  sendPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 60,
    minWidth: 60,
    height: 48,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.discovery.whiteBorder,
    shadowColor: colors.dark.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sendDisabled: { opacity: 0.45 },
  closed: { fontSize: 13 },
  floatingTypingRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    zIndex: 3,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: ONE_LINE_MESSAGE_HEIGHT,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    paddingHorizontal: spacing.md,
    shadowColor: colors.dark.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3 },
});

function TypingIndicator({
  accessibilityLabel,
  palette,
}: {
  accessibilityLabel: string;
  palette: Palette;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.typingBubble, { backgroundColor: palette.surfaceVariant }]}
    >
      <TypingDot color={palette.muted} delay={0} />
      <TypingDot color={palette.muted} delay={140} />
      <TypingDot color={palette.muted} delay={280} />
    </View>
  );
}

function TypingDot({ color, delay }: { color: string; delay: number }) {
  const progress = useSharedValue(0.35);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: 0.85 + progress.get() * 0.15 }],
  }));

  useEffect(() => {
    progress.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 320 }),
            withTiming(0.35, { duration: 320 }),
          ),
          -1,
        ),
      ),
    );
  }, [delay, progress]);

  return (
    <Animated.View
      style={[styles.typingDot, { backgroundColor: color }, animatedStyle]}
    />
  );
}

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

function ConversationMessagesSkeleton({
  label,
  palette,
}: {
  label: string;
  palette: Palette;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.messagesSkeleton}
    >
      <View
        style={[
          styles.messagesSkeletonBubble,
          styles.messagesSkeletonIncoming,
          { backgroundColor: palette.surfaceVariant },
        ]}
      />
      <View
        style={[
          styles.messagesSkeletonBubble,
          styles.messagesSkeletonOutgoing,
          { backgroundColor: palette.surfaceVariant },
        ]}
      />
      <View
        style={[
          styles.messagesSkeletonBubble,
          styles.messagesSkeletonIncoming,
          { backgroundColor: palette.surfaceVariant },
        ]}
      />
    </View>
  );
}

function MessageListError({
  message,
  retryLabel,
  onRetry,
  palette,
}: {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  palette: Palette;
}) {
  return (
    <View style={styles.messagesInlineState}>
      <Text
        accessibilityRole="alert"
        style={[styles.messagesInlineStateText, { color: palette.muted }]}
      >
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        onPress={onRetry}
        style={styles.messagesInlineStateAction}
      >
        <Text
          style={[
            styles.messagesInlineStateActionText,
            { color: colors.brand },
          ]}
        >
          {retryLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function ConversationHeader({
  displayName,
  avatarAssetId,
  active,
  palette,
  statusLabel,
}: {
  displayName: string;
  avatarAssetId?: string | null;
  active: boolean;
  palette: Palette;
  statusLabel: string;
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
            <Text style={[styles.avatarFallback, { color: colors.onBrand }]}>
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.headerCopy}>
          <Text
            numberOfLines={1}
            style={[styles.headerName, { color: palette.text }]}
          >
            {displayName}
          </Text>
          <Text
            style={[
              styles.headerStatus,
              { color: active ? colors.success : palette.muted },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

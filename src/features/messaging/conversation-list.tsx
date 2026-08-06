import {
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useI18n, type Translate } from '@/i18n/i18n-provider';
import type { Locale } from '@/i18n/messages';
import type {
  ConversationResponse,
  MatchResponse,
} from '@/generated/api/types.gen';
import { useOptionalTheme } from '@/providers/theme-provider';
import { queryKeys } from '@/services/api/query-keys';
import { getSignedAssetUrl } from '@/services/media/signed-url-cache';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { discoveryApi } from '../discovery/discovery.api';
import { messagingApi } from './messaging.api';
import { conversationMessagesOptions } from './messaging.queries';
import type { ConversationSummary } from './messaging.types';

type Palette = (typeof colors)['light'] | (typeof colors)['dark'];
type Filter = 'all' | 'unread' | 'work' | 'personal';
type ConversationRuntime = ConversationResponse & {
  category?: string | null;
  isRead?: boolean;
  unreadCount?: number | null;
  counterpart?: {
    displayName?: string | null;
    avatarAssetId?: string | null;
    isOnline?: boolean;
  };
  lastMessage?: {
    content?: string | null;
    messageType?: string | null;
  };
};

const filters: {
  key: Filter;
  labelKey: 'messaging.filterAll' | 'messaging.filterUnread';
}[] = [
  { key: 'all', labelKey: 'messaging.filterAll' },
  { key: 'unread', labelKey: 'messaging.filterUnread' },
];

export function ConversationList({
  scope,
}: {
  scope: { userId: string; roleId: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const conversations = useInfiniteQuery({
    queryKey: queryKeys.conversations(scope),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      messagingApi.conversations(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor,
  });
  const items = useMemo(
    () => conversations.data?.pages.flatMap((page) => page.items) ?? [],
    [conversations.data],
  );
  const matchIds = useMemo(
    () => [...new Set(items.map((conversation) => conversation.matchId))],
    [items],
  );
  const matchQueries = useQueries({
    queries: matchIds.map((matchId) => ({
      queryKey: queryKeys.match(scope, matchId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        discoveryApi.match(matchId, signal),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const matchesById = new Map(
    matchIds.map(
      (matchId, index) =>
        [
          matchId,
          matchQueries[index]?.data as MatchResponse | undefined,
        ] as const,
    ),
  );

  const rows = items.map((conversation) => ({
    conversation: conversation as ConversationRuntime,
    match: matchesById.get(conversation.matchId),
  }));
  const visibleRows = rows.filter(({ conversation, match }) => {
    const counterpart = conversation.counterpart ?? match?.counterpart;
    const name = counterpart?.displayName ?? t('discovery.matches.defaultName');
    const preview = getPreview(conversation, t);
    const formatLocale = locale === 'en' ? 'en-US' : 'vi-VN';
    const normalizedSearch = search.trim().toLocaleLowerCase(formatLocale);
    const matchesSearch =
      !normalizedSearch ||
      `${name} ${preview}`
        .toLocaleLowerCase(formatLocale)
        .includes(normalizedSearch);
    if (!matchesSearch) return false;
    if (activeFilter === 'unread') return isUnread(conversation);
    if (activeFilter === 'work' || activeFilter === 'personal') {
      const category = conversation.category?.toLowerCase();
      return !category || category === activeFilter;
    }
    return true;
  });
  const prefetchMessages = useCallback(
    (conversationId: string) => {
      void queryClient.prefetchInfiniteQuery(
        conversationMessagesOptions(scope, conversationId),
      );
    },
    [queryClient, scope],
  );

  if (conversations.isPending)
    return <LoadingState label={t('messaging.loading')} />;
  if (conversations.isError) {
    return (
      <ErrorState
        title={t('messaging.loadError')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void conversations.refetch()}
      />
    );
  }
  if (!items.length)
    return (
      <EmptyState
        title={t('messaging.empty')}
        message={t('messaging.emptyMessage')}
      />
    );

  return (
    <AppScreen
      contentStyle={[styles.content, { backgroundColor: palette.background }]}
      header={
        <MessagesHeader palette={palette} title={t('messaging.headerTitle')} />
      }
    >
      <View
        style={[styles.searchBox, { backgroundColor: palette.surfaceVariant }]}
      >
        <SymbolView
          name="magnifyingglass"
          size={20}
          tintColor={palette.muted}
        />
        <TextInput
          accessibilityLabel={t('messaging.searchA11y')}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          onChangeText={setSearch}
          placeholder={t('messaging.searchPlaceholder')}
          placeholderTextColor={palette.muted}
          style={[styles.searchInput, { color: palette.text }]}
          value={search}
        />
      </View>

      <ScrollView
        horizontal
        style={styles.filterScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
      >
        {filters.map((filter) => (
          <Pressable
            key={filter.key}
            accessibilityRole="button"
            accessibilityState={{ selected: activeFilter === filter.key }}
            onPress={() => setActiveFilter(filter.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  activeFilter === filter.key
                    ? colors.brand
                    : palette.surfaceVariant,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    activeFilter === filter.key
                      ? colors.onBrand
                      : palette.muted,
                },
              ]}
            >
              {t(filter.labelKey)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.list}>
        {visibleRows.length ? (
          visibleRows.map(({ conversation, match }, index) => (
            <View key={conversation.id}>
              <ConversationRow
                conversation={conversation}
                match={match}
                palette={palette}
                t={t}
                locale={locale}
                onPrefetch={() => prefetchMessages(conversation.id)}
                onPress={() => {
                  const summary = getConversationSummary(conversation, match);
                  router.push({
                    pathname: '/(details)/conversation/[id]',
                    params: {
                      id: summary.id,
                      displayName: summary.displayName ?? '',
                      avatarAssetId: summary.avatarAssetId ?? '',
                      matchId: summary.matchId,
                      status: summary.status,
                    },
                  });
                }}
              />
              {index < visibleRows.length - 1 ? (
                <View
                  style={[
                    styles.rowSeparator,
                    { backgroundColor: palette.border },
                  ]}
                />
              ) : null}
            </View>
          ))
        ) : (
          <View
            style={[
              styles.noResults,
              { backgroundColor: palette.surfaceVariant },
            ]}
          >
            <SymbolView
              name="magnifyingglass"
              size={24}
              tintColor={palette.muted}
            />
            <Text style={[styles.noResultsTitle, { color: palette.text }]}>
              {t('messaging.noResultsTitle')}
            </Text>
            <Text style={[styles.noResultsText, { color: palette.muted }]}>
              {t('messaging.noResultsMessage')}
            </Text>
          </View>
        )}
      </View>

      {conversations.hasNextPage ? (
        <Button
          label={t('messaging.loadMore')}
          variant="secondary"
          loading={conversations.isFetchingNextPage}
          onPress={() => void conversations.fetchNextPage()}
        />
      ) : null}
    </AppScreen>
  );
}

function MessagesHeader({
  palette,
  title,
}: {
  palette: Palette;
  title: string;
}) {
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: palette.background,
          borderBottomColor: palette.border,
        },
      ]}
    >
      <View style={styles.headerIdentity}>
        <View
          style={[
            styles.headerAvatar,
            { backgroundColor: palette.infoContainer },
          ]}
        >
          <Text style={[styles.headerAvatarText, { color: colors.brand }]}>
            P
          </Text>
        </View>
        <Text style={[styles.headerTitle, { color: palette.text }]}>
          {title}
        </Text>
      </View>
    </View>
  );
}

function ConversationRow({
  conversation,
  match,
  palette,
  onPrefetch,
  onPress,
  t,
  locale,
}: {
  conversation: ConversationRuntime;
  match?: MatchResponse;
  palette: Palette;
  onPrefetch: () => void;
  onPress: () => void;
  t: Translate;
  locale: Locale;
}) {
  const counterpart = conversation.counterpart ?? match?.counterpart;
  const name =
    counterpart?.displayName?.trim() || t('discovery.matches.defaultName');
  const avatarAssetId = counterpart?.avatarAssetId ?? undefined;
  const avatarQuery = useQuery({
    queryKey: ['conversation-avatar', avatarAssetId],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      getSignedAssetUrl(avatarAssetId!, { signal }),
    enabled: Boolean(avatarAssetId),
    staleTime: 10 * 60 * 1000,
  });
  const unread = isUnread(conversation);
  const initials = getInitials(name);

  return (
    <Pressable
      accessibilityLabel={t('messaging.openConversation', { name })}
      accessibilityRole="button"
      onPressIn={onPrefetch}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: palette.surface, opacity: pressed ? 0.78 : 1 },
        unread && { borderColor: colors.brand, borderWidth: 1 },
      ]}
    >
      <View style={styles.rowInner}>
        <View style={styles.avatarWrap}>
          {avatarQuery.data ? (
            <Image
              source={avatarQuery.data}
              contentFit="cover"
              style={styles.avatarImage}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: palette.infoContainer },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.brand }]}>
                {initials}
              </Text>
            </View>
          )}
          {(counterpart as { isOnline?: boolean } | undefined)?.isOnline ? (
            <View
              style={[styles.onlineDot, { borderColor: palette.surface }]}
            />
          ) : null}
        </View>
        <View style={styles.rowCopy}>
          <View style={styles.rowTopLine}>
            <Text
              numberOfLines={1}
              style={[
                styles.name,
                { color: palette.text },
                unread && styles.unreadText,
              ]}
            >
              {name}
            </Text>
            <Text
              style={[
                styles.time,
                { color: unread ? colors.brand : palette.muted },
              ]}
            >
              {formatTimestamp(
                conversation.lastMessageAt ?? conversation.createdAt,
                locale,
                t,
              )}
            </Text>
          </View>
          <View style={styles.rowBottomLine}>
            <Text
              numberOfLines={1}
              style={[
                styles.preview,
                { color: palette.muted },
                unread && styles.unreadText,
              ]}
            >
              {getPreview(conversation, t)}
            </Text>
            {conversation.unreadCount && conversation.unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {conversation.unreadCount > 99
                    ? '99+'
                    : conversation.unreadCount}
                </Text>
              </View>
            ) : unread ? (
              <SymbolView name="checkmark" size={17} tintColor={colors.brand} />
            ) : (
              <SymbolView
                name="checkmark.circle"
                size={17}
                tintColor={palette.muted}
              />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function isUnread(conversation: ConversationRuntime) {
  return Boolean(
    (conversation.unreadCount && conversation.unreadCount > 0) ||
    conversation.isRead === false,
  );
}

function getConversationSummary(
  conversation: ConversationRuntime,
  match?: MatchResponse,
): ConversationSummary {
  const counterpart = conversation.counterpart ?? match?.counterpart;
  return {
    id: conversation.id,
    matchId: conversation.matchId,
    status: conversation.status,
    displayName: counterpart?.displayName,
    avatarAssetId: counterpart?.avatarAssetId,
  };
}

function getPreview(conversation: ConversationRuntime, t: Translate) {
  const content = conversation.lastMessage?.content?.trim();
  if (content) return content;
  const messageType = conversation.lastMessage?.messageType;
  if (messageType === 'IMAGE') return t('messaging.image');
  if (messageType === 'FILE') return t('messaging.file');
  if (messageType === 'SYSTEM') return t('messaging.system');
  return conversation.lastMessageAt
    ? t('messaging.conversationTitle')
    : t('messaging.noMessages');
}

function getInitials(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  return (
    words.length > 1
      ? `${words[0]?.[0] ?? ''}${words.at(-1)?.[0] ?? ''}`
      : words[0]?.[0] || 'P'
  ).toUpperCase();
}

function formatTimestamp(
  value: string | undefined | null,
  locale: Locale,
  t: Translate,
) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay)
    return date.toLocaleTimeString(locale === 'en' ? 'en-US' : 'vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return t('messaging.yesterday');
  if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN', {
      weekday: 'short',
    });
  }
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerAvatar: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  headerAvatarText: { fontFamily: typography.bold, fontSize: 14 },
  headerTitle: { fontFamily: typography.semibold, fontSize: 16 },
  heading: { gap: spacing.xs },
  title: { fontFamily: typography.bold, fontSize: 30, letterSpacing: -0.5 },
  subtitle: { fontFamily: typography.regular, fontSize: 13 },
  searchBox: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sheet,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 0,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 38,
  },
  filterList: {
    alignItems: 'center',
    height: 38,
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterChip: {
    alignSelf: 'flex-start',
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  filterText: { fontFamily: typography.semibold, fontSize: 13 },
  list: { gap: 0 },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
    opacity: 1,
  },
  row: {
    width: '100%',
    minHeight: 78,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...elevation.card,
  },
  rowInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: { width: 56, height: 56 },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarText: { fontFamily: typography.bold, fontSize: 18 },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 14,
    height: 14,
    borderWidth: 2,
    borderRadius: 7,
    backgroundColor: colors.success,
  },
  rowCopy: { flex: 1, gap: spacing.xs },
  rowTopLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: { flex: 1, fontFamily: typography.semibold, fontSize: 15 },
  time: { fontFamily: typography.medium, fontSize: 11 },
  preview: { flex: 1, fontFamily: typography.regular, fontSize: 13 },
  unreadText: { fontFamily: typography.bold },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.brand,
  },
  unreadBadgeText: {
    color: colors.onBrand,
    fontFamily: typography.bold,
    fontSize: 11,
  },
  noResults: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
  noResultsTitle: {
    fontFamily: typography.semibold,
    fontSize: 15,
    textAlign: 'center',
  },
  noResultsText: {
    fontFamily: typography.regular,
    fontSize: 13,
    textAlign: 'center',
  },
});

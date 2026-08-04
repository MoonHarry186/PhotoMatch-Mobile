import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StatusBadge } from '@/components/domain';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/i18n-provider';
import { messages, type Locale } from '@/i18n/messages';
import { queryKeys } from '@/services/api/query-keys';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { discoveryApi } from './discovery.api';
import { reconcileMatches } from './discovery.types';

export function MatchList({
  scope,
  dark = false,
}: {
  scope: { userId: string; roleId: string };
  dark?: boolean;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const matches = useInfiniteQuery({
    queryKey: queryKeys.matches(scope),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => discoveryApi.matches(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = reconcileMatches(
    [],
    matches.data?.pages.flatMap((page) => page.items) ?? [],
  );

  if (matches.isPending)
    return dark ? (
      <MatchState loading title={t('discovery.matches.loading')} />
    ) : (
      <LoadingState label={t('discovery.matches.loading')} />
    );
  if (matches.isError)
    return dark ? (
      <MatchState
        title={t('discovery.matches.error')}
        actionLabel={t('common.retry')}
        onAction={() => void matches.refetch()}
      />
    ) : (
      <ErrorState
        title={t('discovery.matches.error')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void matches.refetch()}
      />
    );
  if (!items.length)
    return dark ? (
      <MatchState
        title={t('discovery.matches.empty')}
        message={t('discovery.matches.emptyMessage')}
      />
    ) : (
      <EmptyState
        title={t('discovery.matches.empty')}
        message={t('discovery.matches.emptyMessage')}
      />
    );

  const palette = dark ? colors.dark : colors.light;

  return (
    <View style={styles.list}>
      {items.map((match) => {
        const name =
          match.counterpart.displayName || t('discovery.matches.defaultName');
        return (
          <Pressable
            key={match.id}
            accessibilityRole="button"
            accessibilityLabel={t('discovery.matches.open', { name })}
            onPress={() =>
              router.push({
                pathname: '/(details)/match/[id]',
                params: { id: match.id },
              })
            }
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: palette.infoContainer },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.brand }]}>
                {name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text style={[styles.name, { color: palette.text }]}>{name}</Text>
              <Text style={[styles.meta, { color: palette.muted }]}>
                {t('discovery.matches.fromDate', {
                  date: new Date(match.matchedAt).toLocaleDateString(
                    locale === 'vi' ? 'vi-VN' : 'en-US',
                  ),
                })}
              </Text>
              <StatusBadge
                label={matchStatusLabel(match.status, locale)}
                tone={
                  match.status === 'ACTIVE'
                    ? 'success'
                    : match.status === 'BLOCKED'
                      ? 'warning'
                      : 'neutral'
                }
              />
            </View>
            <Text style={[styles.chevron, { color: palette.muted }]}>›</Text>
          </Pressable>
        );
      })}
      {matches.hasNextPage ? (
        <Button
          label={t('discovery.matches.loadMore')}
          variant="secondary"
          loading={matches.isFetchingNextPage}
          onPress={() => void matches.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}

function MatchState({
  title,
  message,
  actionLabel,
  loading = false,
  onAction,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  loading?: boolean;
  onAction?: () => void;
}) {
  return (
    <View
      accessibilityRole={loading ? 'progressbar' : 'summary'}
      style={styles.state}
    >
      {loading ? <ActivityIndicator color={colors.brand} size="large" /> : null}
      <Text style={styles.stateTitle}>{title}</Text>
      {message ? <Text style={styles.stateMessage}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

export function matchStatusLabel(
  status: 'ACTIVE' | 'ENDED' | 'BLOCKED',
  locale: Locale = 'vi',
) {
  if (status === 'ACTIVE')
    return messages[locale]['discovery.matches.statusActive'];
  if (status === 'BLOCKED')
    return messages[locale]['discovery.matches.statusBlocked'];
  return messages[locale]['discovery.matches.statusEnded'];
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...elevation.card,
  },
  avatar: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.light.infoContainer,
  },
  avatarText: {
    fontFamily: typography.bold,
    fontSize: 22,
  },
  flex: { flex: 1, alignItems: 'flex-start', gap: spacing.xs },
  name: {
    fontFamily: typography.bold,
    fontSize: 17,
  },
  meta: {},
  chevron: { fontSize: 28 },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.dark.text,
    fontFamily: typography.bold,
    fontSize: 20,
    textAlign: 'center',
  },
  stateMessage: {
    color: colors.dark.muted,
    textAlign: 'center',
  },
});

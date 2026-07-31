import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/domain';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { Button } from '@/components/ui';
import { queryKeys } from '@/services/api/query-keys';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { discoveryApi } from './discovery.api';
import { reconcileMatches } from './discovery.types';

export function MatchList({
  scope,
}: {
  scope: { userId: string; roleId: string };
}) {
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

  if (matches.isPending) return <LoadingState label="Đang tải các kết nối…" />;
  if (matches.isError)
    return (
      <ErrorState
        title="Không thể tải kết nối"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void matches.refetch()}
      />
    );
  if (!items.length)
    return (
      <EmptyState
        title="Chưa có kết nối"
        message="Kết nối được tạo khi Photographer chấp nhận một yêu cầu quan tâm."
      />
    );

  return (
    <View style={styles.list}>
      {items.map((match) => (
        <Pressable
          key={match.id}
          accessibilityRole="button"
          accessibilityLabel={`Mở kết nối với ${match.counterpart.displayName ?? 'người dùng'}`}
          onPress={() =>
            router.push({
              pathname: '/(details)/match/[id]',
              params: { id: match.id },
            })
          }
          style={styles.card}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(match.counterpart.displayName ?? 'P').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>
              {match.counterpart.displayName ?? 'Người dùng PhotoMatch'}
            </Text>
            <Text style={styles.meta}>
              Kết nối từ {new Date(match.matchedAt).toLocaleDateString('vi-VN')}
            </Text>
            <StatusBadge
              label={matchStatusLabel(match.status)}
              tone={
                match.status === 'ACTIVE'
                  ? 'success'
                  : match.status === 'BLOCKED'
                    ? 'warning'
                    : 'neutral'
              }
            />
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      {matches.hasNextPage ? (
        <Button
          label="Xem thêm kết nối"
          variant="secondary"
          loading={matches.isFetchingNextPage}
          onPress={() => void matches.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}

export function matchStatusLabel(status: 'ACTIVE' | 'ENDED' | 'BLOCKED') {
  if (status === 'ACTIVE') return 'Đang kết nối';
  if (status === 'BLOCKED') return 'Đã chặn';
  return 'Đã kết thúc';
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
    backgroundColor: colors.light.surface,
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
    color: colors.brand,
    fontFamily: typography.bold,
    fontSize: 22,
  },
  flex: { flex: 1, alignItems: 'flex-start', gap: spacing.xs },
  name: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 17,
  },
  meta: { color: colors.light.muted },
  chevron: { color: colors.light.muted, fontSize: 28 },
});

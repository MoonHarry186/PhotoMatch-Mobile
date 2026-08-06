import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, Select } from '@/components/ui';
import { useI18n, type Translate } from '@/i18n/i18n-provider';
import { messages } from '@/i18n/messages';
import { queryKeys } from '@/services/api/query-keys';
import { useTheme } from '@/providers/theme-provider';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { bookingApi } from './booking.api';
import type { BookingStatusDto } from '@/generated/api/types.gen';

export function BookingList({
  scope,
}: {
  scope: { userId: string; roleId: string };
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const [status, setStatus] = useState('');
  const statusFilters = [
    { value: '', label: t('booking.statusAll') },
    { value: 'PENDING', label: t('booking.pending') },
    { value: 'ACCEPTED', label: t('booking.accepted') },
    { value: 'COMPLETED', label: t('booking.completed') },
    { value: 'CANCELLED', label: t('booking.cancelled') },
  ];
  const query = useInfiniteQuery({  
    queryKey: queryKeys.bookings(scope, { status }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      bookingApi.list(
        {
          cursor: pageParam,
          limit: 20,
          status: (status || undefined) as
            BookingStatusDto['status'] | undefined,
        },
        signal,
      ),
    getNextPageParam: (page) => page.nextCursor,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  if (query.isPending) return <LoadingState label={t('booking.loading')} />;
  if (query.isError)
    return (
      <ErrorState
        title={t('booking.loadError')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void query.refetch()}
      />
    );
  return (
    <AppScreen>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.text }]}
      >
        {t('booking.title')}
      </Text>
      <Select
        label={t('booking.filterStatus')}
        value={status}
        options={statusFilters}
        onChange={(next) =>
          setStatus(Array.isArray(next) ? (next[0] ?? '') : next)
        }
      />
      {!items.length ? (
        <EmptyState
          title={t('booking.emptyTitle')}
          message={t('booking.emptyMessage')}
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.card, { backgroundColor: palette.surface }]}
              onPress={() =>
                router.push({
                  pathname: '/(details)/booking/[id]',
                  params: { id: item.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={t('booking.open', { id: item.id })}
            >
              <View style={styles.copy}>
                <Text style={[styles.status, { color: palette.info }]}>
                  {bookingStatusLabel(item.status, t)}
                </Text>
                <Text style={[styles.date, { color: palette.text }]}>
                  {new Date(item.scheduledStart).toLocaleString(
                    locale === 'en' ? 'en-US' : 'vi-VN',
                  )}
                </Text>
                <Text style={[styles.meta, { color: palette.muted }]}>
                  {item.agreedPrice?.toLocaleString(
                    locale === 'en' ? 'en-US' : 'vi-VN',
                  ) ?? t('booking.noPrice')}{' '}
                  {item.currency ?? 'VND'}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: palette.muted }]}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
      {query.hasNextPage ? (
        <Button
          label={t('booking.loadMore')}
          variant="secondary"
          loading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      ) : null}
    </AppScreen>
  );
}

export function bookingStatusLabel(status: string, t?: Translate) {
  const labels: Record<string, Parameters<Translate>[0]> = {
    DRAFT: 'booking.draft',
    PENDING: 'booking.pending',
    ACCEPTED: 'booking.accepted',
    REJECTED: 'booking.rejected',
    CANCELLED: 'booking.cancelled',
    IN_PROGRESS: 'booking.inProgress',
    COMPLETED: 'booking.completed',
    DISPUTED: 'booking.disputed',
  };
  const key = labels[status];
  return key
    ? t
      ? t(key)
      : messages.vi[key]
    : t
      ? t('common.unknown')
      : messages.vi['common.unknown'];
}

const styles = StyleSheet.create({
  title: {
    fontFamily: typography.bold,
    fontSize: 26,
  },
  list: { gap: spacing.md },
  card: {
    minHeight: 90,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...elevation.card,
  },
  copy: { flex: 1, gap: spacing.xs },
  status: { fontFamily: typography.semibold },
  date: { fontFamily: typography.medium },
  meta: {},
  chevron: { fontSize: 28 },
});

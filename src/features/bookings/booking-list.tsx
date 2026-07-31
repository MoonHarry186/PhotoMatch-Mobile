import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, Select } from '@/components/ui';
import { queryKeys } from '@/services/api/query-keys';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { bookingApi } from './booking.api';
import type { BookingStatusDto } from '@/generated/api/types.gen';

const statusFilters = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Đang chờ' },
  { value: 'ACCEPTED', label: 'Đã xác nhận' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export function BookingList({
  scope,
}: {
  scope: { userId: string; roleId: string };
}) {
  const router = useRouter();
  const [status, setStatus] = useState('');
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
  if (query.isPending) return <LoadingState label="Đang tải lịch chụp…" />;
  if (query.isError)
    return (
      <ErrorState
        title="Không thể tải lịch chụp"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void query.refetch()}
      />
    );
  return (
    <AppScreen>
      <Text accessibilityRole="header" style={styles.title}>
        Lịch chụp
      </Text>
      <Select
        label="Lọc trạng thái"
        value={status}
        options={statusFilters}
        onChange={(next) =>
          setStatus(Array.isArray(next) ? (next[0] ?? '') : next)
        }
      />
      {!items.length ? (
        <EmptyState
          title="Chưa có lịch chụp"
          message="Các lịch chụp sẽ xuất hiện sau khi bạn gửi hoặc nhận lời mời."
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/(details)/booking/[id]',
                  params: { id: item.id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Mở lịch chụp ${item.id}`}
            >
              <View style={styles.copy}>
                <Text style={styles.status}>
                  {bookingStatusLabel(item.status)}
                </Text>
                <Text style={styles.date}>
                  {new Date(item.scheduledStart).toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.meta}>
                  {item.agreedPrice?.toLocaleString('vi-VN') ?? 'Chưa có giá'}{' '}
                  {item.currency ?? 'VND'}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      )}
      {query.hasNextPage ? (
        <Button
          label="Xem thêm"
          variant="secondary"
          loading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      ) : null}
    </AppScreen>
  );
}

export function bookingStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Bản nháp',
    PENDING: 'Đang chờ',
    ACCEPTED: 'Đã xác nhận',
    REJECTED: 'Đã từ chối',
    CANCELLED: 'Đã hủy',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Hoàn tất',
    DISPUTED: 'Đang tranh chấp',
  };
  return labels[status] ?? 'Không xác định';
}

const styles = StyleSheet.create({
  title: {
    color: colors.light.text,
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
    backgroundColor: colors.light.surface,
    ...elevation.card,
  },
  copy: { flex: 1, gap: spacing.xs },
  status: { color: colors.brand, fontFamily: typography.semibold },
  date: { color: colors.light.text, fontFamily: typography.medium },
  meta: { color: colors.light.muted },
  chevron: { color: colors.light.muted, fontSize: 28 },
});

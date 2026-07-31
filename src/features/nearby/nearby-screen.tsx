import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FilterChips, StatusBadge } from '@/components/domain';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { LocationPermissionCard, PresenceCard } from './location-presence';
import { nearbyApi } from './nearby.api';
import { NearbyFilterSheet } from './nearby-filter-sheet';
import { useNearbyStore } from './nearby.store';
import {
  defaultNearbyFilters,
  type NearbyCandidate,
  type NearbyFilters,
} from './nearby.types';

export function NearbyScreen() {
  const session = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = session.snapshot?.user;
  const role = user?.roles.find((item) => item.id === user.currentRoleId)?.code;
  const scope = useMemo(
    () => ({
      userId: user?.id ?? 'unknown',
      roleId: user?.currentRoleId ?? 'no-role',
    }),
    [user?.currentRoleId, user?.id],
  );
  const targetRole = role === 'PHOTOGRAPHER' ? 'CUSTOMER' : 'PHOTOGRAPHER';
  const filters = useNearbyStore((state) => state.filters);
  const setFilters = useNearbyStore((state) => state.setFilters);
  const resetFilters = useNearbyStore((state) => state.resetFilters);
  const [filterVisible, setFilterVisible] = useState(false);

  const services = useQuery({
    queryKey: queryKeys.public('nearby-services'),
    queryFn: nearbyApi.services,
  });
  const nearby = useInfiniteQuery({
    queryKey: queryKeys.nearby(scope, { targetRole, ...filters }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      nearbyApi.list(targetRole, filters, pageParam, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(user?.currentRoleId && role),
  });

  const applyFilters = async (next: NearbyFilters) => {
    await queryClient.cancelQueries({
      queryKey: queryKeys.nearbyRoot(scope),
    });
    setFilters(next);
    setFilterVisible(false);
  };
  const items = nearby.data?.pages.flatMap((page) => page.items) ?? [];
  const activeChips = filterChips(filters, services.data ?? []);

  if (!user?.currentRoleId || !role)
    return <ErrorState title="Chưa xác định được vai trò hiện tại" />;

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.title}>
            Quanh đây
          </Text>
          <Text style={styles.subtitle}>
            Danh sách dùng khoảng cách gần đúng từ backend, không nhận tọa độ
            của người khác.
          </Text>
        </View>
        <Button
          label="Bộ lọc"
          variant="secondary"
          onPress={() => setFilterVisible(true)}
        />
      </View>

      <LocationPermissionCard scope={scope} />
      <PresenceCard scope={scope} />

      {activeChips.length ? (
        <View style={styles.filterSummary}>
          <FilterChips
            values={activeChips}
            onRemove={(key) => void applyFilters(removeFilter(filters, key))}
          />
          <Button
            label="Xóa tất cả bộ lọc"
            variant="ghost"
            onPress={async () => {
              await queryClient.cancelQueries({
                queryKey: queryKeys.nearbyRoot(scope),
              });
              resetFilters();
            }}
          />
        </View>
      ) : null}

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Hồ sơ phù hợp
      </Text>
      {nearby.isPending ? (
        <LoadingState label="Đang tìm người phù hợp quanh bạn…" />
      ) : nearby.isError ? (
        <ErrorState
          title="Không thể tải Nearby"
          description="Vị trí đã lưu, quyền truy cập hoặc kết nối có thể chưa sẵn sàng."
          primaryActionLabel="Thử lại"
          onPrimaryAction={() => void nearby.refetch()}
        />
      ) : items.length ? (
        <View style={styles.list}>
          {items.map((item) => (
            <NearbyCandidateCard
              key={item.userRoleId}
              item={item}
              onPress={() =>
                router.push({
                  pathname: '/(details)/profile/[id]',
                  params: { id: item.userRoleId },
                })
              }
            />
          ))}
          {nearby.hasNextPage ? (
            <Button
              label="Xem thêm"
              variant="secondary"
              loading={nearby.isFetchingNextPage}
              onPress={() => void nearby.fetchNextPage()}
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          title="Chưa tìm thấy người phù hợp"
          message="Hãy cập nhật vị trí, mở rộng bán kính hoặc thay đổi bộ lọc. Những tính năng khác vẫn sử dụng bình thường."
        />
      )}

      {filterVisible ? (
        <NearbyFilterSheet
          visible
          filters={filters}
          services={services.data ?? []}
          onApply={(next) => void applyFilters(next)}
          onClose={() => setFilterVisible(false)}
        />
      ) : null}
    </AppScreen>
  );
}

function NearbyCandidateCard({
  item,
  onPress,
}: {
  item: NearbyCandidate;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mở hồ sơ ${item.displayName}, cách ${item.distance}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>
          {item.displayName.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.displayName}</Text>
        {item.headline ? (
          <Text numberOfLines={2} style={styles.subtitle}>
            {item.headline}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <StatusBadge label={item.distance} />
          {item.verified ? (
            <StatusBadge label="Đã xác minh" tone="success" />
          ) : null}
          {item.availabilityStatus === 'AVAILABLE' ? (
            <StatusBadge label="Đang sẵn sàng" tone="success" />
          ) : null}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function filterChips(
  filters: NearbyFilters,
  services: { id: string; name: string }[],
) {
  const serviceNames = new Map(services.map((item) => [item.id, item.name]));
  return [
    ...filters.serviceIds.map((id) => ({
      key: `service:${id}`,
      label: serviceNames.get(id) ?? 'Dịch vụ',
    })),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? [
          {
            key: 'price',
            label: `Giá ${filters.minPrice ?? 0}–${filters.maxPrice ?? '∞'} VND`,
          },
        ]
      : []),
    ...(filters.radiusKm !== defaultNearbyFilters.radiusKm
      ? [{ key: 'radius', label: `${filters.radiusKm} km` }]
      : []),
    ...(filters.availableOnly
      ? [{ key: 'available', label: 'Đang sẵn sàng' }]
      : []),
    ...(filters.verifiedOnly
      ? [{ key: 'verified', label: 'Đã xác minh' }]
      : []),
  ];
}

function removeFilter(filters: NearbyFilters, key: string): NearbyFilters {
  if (key.startsWith('service:')) {
    const id = key.slice('service:'.length);
    return {
      ...filters,
      serviceIds: filters.serviceIds.filter((item) => item !== id),
    };
  }
  if (key === 'price') {
    return {
      serviceIds: filters.serviceIds,
      radiusKm: filters.radiusKm,
      availableOnly: filters.availableOnly,
      verifiedOnly: filters.verifiedOnly,
    };
  }
  if (key === 'radius')
    return { ...filters, radiusKm: defaultNearbyFilters.radiusKm };
  if (key === 'available') return { ...filters, availableOnly: false };
  if (key === 'verified') return { ...filters, verifiedOnly: false };
  return filters;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: { flex: 1, gap: spacing.xs },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 28,
  },
  subtitle: { color: colors.light.muted, lineHeight: 20 },
  sectionTitle: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  filterSummary: { gap: spacing.sm },
  list: { gap: spacing.md },
  card: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
    ...elevation.card,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.light.infoContainer,
  },
  avatarText: {
    color: colors.brand,
    fontFamily: typography.bold,
    fontSize: 22,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  cardTitle: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chevron: { color: colors.brand, fontSize: 28 },
});

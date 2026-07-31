import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppBanner,
  AppSnackbar,
  EmptyState,
  ErrorState,
  LoadingState,
  type SnackbarPayload,
} from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import {
  captureCurrentLocation,
  getLocationPermissionState,
  requestLocationPermission,
} from '@/features/nearby/location-permission';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { useNavigationStore } from '@/stores/navigation.store';
import { colors, radius, spacing, typography } from '@/theme';

import { DiscoveryCard } from './discovery-card';
import { DiscoveryFilterSheet } from './discovery-filter-sheet';
import { discoveryApi } from './discovery.api';
import { useDiscoveryStore } from './discovery.store';
import {
  DISCOVERY_IMAGE_PRELOAD_LIMIT,
  LEFT_COOLDOWN_DAYS,
  locationPermissionMessage,
  relationshipErrorMessage,
  roleDiscoveryActions,
  type DiscoveryFilters,
} from './discovery.types';
import { IncomingInterests } from './incoming-interests';
import { MatchList } from './match-list';

type DiscoveryView = 'feed' | 'interests' | 'matches';

export function DiscoveryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useSession().snapshot?.user;
  const role = user?.roles.find((item) => item.id === user.currentRoleId)?.code;
  const scope = useMemo(
    () => ({
      userId: user?.id ?? 'unknown',
      roleId: user?.currentRoleId ?? 'no-role',
    }),
    [user?.currentRoleId, user?.id],
  );
  const actions =
    role === 'CUSTOMER' || role === 'PHOTOGRAPHER'
      ? roleDiscoveryActions(role)
      : null;
  const [view, setView] = useState<DiscoveryView>(() =>
    role === 'PHOTOGRAPHER' ? 'interests' : 'feed',
  );
  const [bannerVisible, setBannerVisible] = useState(() =>
    useNavigationStore.getState().consumeProviderSetupBanner(),
  );
  const [filterVisible, setFilterVisible] = useState(false);
  const [feedback, setFeedback] = useState<SnackbarPayload | null>(null);
  const filters = useDiscoveryStore((state) => state.filters);
  const setFilters = useDiscoveryStore((state) => state.setFilters);
  const activeFilterCount = useMemo(
    () =>
      Number(filters.serviceIds.length > 0) +
      Number(filters.minPrice !== undefined || filters.maxPrice !== undefined) +
      Number(filters.nearbyOnly) +
      Number(filters.availableOnly) +
      Number(filters.verifiedOnly),
    [filters],
  );
  const feedKey = `${scope.userId}:${scope.roleId}:${JSON.stringify(filters)}`;
  const [dismissedState, setDismissedState] = useState<{
    key: string;
    ids: string[];
  }>({ key: '', ids: [] });
  const activeView =
    role === 'PHOTOGRAPHER' && view === 'feed'
      ? 'interests'
      : role === 'CUSTOMER' && view === 'interests'
        ? 'feed'
        : view;

  const services = useQuery({
    queryKey: queryKeys.public('discovery-services'),
    queryFn: discoveryApi.services,
  });
  const candidates = useInfiniteQuery({
    queryKey: queryKeys.discovery(scope, {
      targetRole: 'PHOTOGRAPHER',
      ...filters,
    }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      discoveryApi.candidates(filters, pageParam, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: actions?.canBrowseCandidates === true && activeView === 'feed',
  });
  const visibleCandidates = useMemo(() => {
    const dismissed = dismissedState.key === feedKey ? dismissedState.ids : [];
    return (candidates.data?.pages.flatMap((page) => page.items) ?? []).filter(
      (item) => !dismissed.includes(item.userRoleId),
    );
  }, [candidates.data?.pages, dismissedState, feedKey]);
  const current = visibleCandidates[0];
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = candidates;

  useEffect(() => {
    if (!current && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [current, fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    let active = true;
    const nextAssetIds = visibleCandidates
      .slice(1, 1 + DISCOVERY_IMAGE_PRELOAD_LIMIT)
      .map((item) => item.avatarAssetId)
      .filter((item): item is string => Boolean(item));
    if (!nextAssetIds.length) return;
    void Promise.all(
      nextAssetIds.map((assetId) =>
        queryClient.fetchQuery({
          queryKey: queryKeys.assetUrl(scope, assetId),
          queryFn: ({ signal }) => discoveryApi.assetUrl(assetId, signal),
          staleTime: 4 * 60_000,
        }),
      ),
    ).then((urls) => {
      if (active) void Image.prefetch(urls, 'memory');
    });
    return () => {
      active = false;
    };
  }, [queryClient, scope, visibleCandidates]);

  const swipe = useMutation({
    mutationFn: ({
      candidateId,
      direction,
    }: {
      candidateId: string;
      direction: 'LEFT' | 'RIGHT';
    }) =>
      discoveryApi.swipe({
        targetUserRoleId: candidateId,
        direction,
        source: 'DISCOVERY',
      }),
    onSuccess: (response) => {
      setDismissedState((currentState) => ({
        key: feedKey,
        ids: [
          ...new Set([
            ...(currentState.key === feedKey ? currentState.ids : []),
            response.targetUserRoleId,
          ]),
        ],
      }));
      setFeedback({
        message:
          response.direction === 'RIGHT'
            ? 'Đã gửi quan tâm. Đây chưa phải là kết nối; hãy chờ Photographer phản hồi.'
            : `Đã bỏ qua. Hồ sơ sẽ không xuất hiện lại trong khoảng ${LEFT_COOLDOWN_DAYS} ngày.`,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.interests(scope),
      });
    },
  });
  const swipeError = swipe.error ? normalizeError(swipe.error) : null;
  const swipePending = swipe.isPending;
  const submitSwipe = swipe.mutate;

  const applyFilters = async (next: DiscoveryFilters) => {
    if (next.nearbyOnly) {
      const currentPermission = await getLocationPermissionState();
      const permission =
        currentPermission === 'granted'
          ? currentPermission
          : await requestLocationPermission();
      if (permission !== 'granted') {
        throw new Error(locationPermissionMessage(permission));
      }
      await discoveryApi.updateExactLocation(await captureCurrentLocation());
    }
    await queryClient.cancelQueries({
      queryKey: queryKeys.discoveryRoot(scope),
    });
    setFilters(next);
    setFilterVisible(false);
  };
  const handleSwipe = useCallback(
    (direction: 'LEFT' | 'RIGHT') => {
      if (!current || swipePending) return;
      submitSwipe({ candidateId: current.userRoleId, direction });
    },
    [current, submitSwipe, swipePending],
  );

  if (!user?.currentRoleId || !role || !actions)
    return <ErrorState title="Chưa xác định được vai trò hiện tại" />;

  return (
    <AppScreen scroll={activeView !== 'feed'}>
      <AppBanner
        visible={bannerVisible && role === 'PHOTOGRAPHER'}
        title="Thiết lập hồ sơ Photographer"
        message="Bổ sung dịch vụ, mức giá và portfolio để bắt đầu cung cấp dịch vụ."
        actions={[
          {
            label: 'Thiết lập ngay',
            onPress: () => {
              setBannerVisible(false);
              router.push('/(details)/profile/edit');
            },
          },
          { label: 'Để sau', onPress: () => setBannerVisible(false) },
        ]}
      />
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {role === 'CUSTOMER' ? 'Khám phá' : 'Yêu cầu'}
        </Text>
        {activeView === 'feed' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              activeFilterCount
                ? `Bộ lọc, đang áp dụng ${activeFilterCount} tùy chọn`
                : 'Bộ lọc'
            }
            hitSlop={8}
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setFilterVisible(true)}
          >
            <SymbolView
              name={{
                ios: 'slider.horizontal.3',
                android: 'tune',
                web: 'tune',
              }}
              size={24}
              tintColor={colors.light.text}
            />
            {activeFilterCount ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {role === 'CUSTOMER' ? (
          <TabButton
            label="Khám phá"
            selected={activeView === 'feed'}
            onPress={() => setView('feed')}
          />
        ) : (
          <TabButton
            label="Yêu cầu"
            selected={activeView === 'interests'}
            onPress={() => setView('interests')}
          />
        )}
        <TabButton
          label="Kết nối"
          selected={activeView === 'matches'}
          onPress={() => setView('matches')}
        />
      </View>

      {activeView === 'feed' ? (
        <View style={styles.feed}>
          {swipeError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {relationshipErrorMessage(swipeError) ??
                getUserErrorMessage(swipeError)}
            </Text>
          ) : null}
          {candidates.isPending ? (
            <LoadingState label="Đang tìm Photographer phù hợp…" />
          ) : candidates.isError ? (
            <ErrorState
              title="Không thể tải Khám phá"
              primaryActionLabel="Thử lại"
              onPrimaryAction={() => void candidates.refetch()}
            />
          ) : current ? (
            <DiscoveryCard
              candidate={current}
              scope={scope}
              pending={swipePending}
              onAction={handleSwipe}
              onOpenProfile={() =>
                router.push({
                  pathname: '/(details)/profile/[id]',
                  params: { id: current.userRoleId },
                })
              }
            />
          ) : candidates.isFetchingNextPage ? (
            <LoadingState label="Đang tải thêm hồ sơ…" />
          ) : (
            <EmptyState
              title="Bạn đã xem hết hồ sơ phù hợp"
              message="Hãy quay lại sau hoặc thay đổi bộ lọc. Các hồ sơ đã bỏ qua không được phát lại sớm ở phía client."
            />
          )}
        </View>
      ) : activeView === 'interests' ? (
        <IncomingInterests
          scope={scope}
          onFeedback={(message) => setFeedback({ message })}
        />
      ) : (
        <MatchList scope={scope} />
      )}

      {filterVisible ? (
        <DiscoveryFilterSheet
          filters={filters}
          services={services.data ?? []}
          onApply={applyFilters}
          onClose={() => setFilterVisible(false)}
        />
      ) : null}
      <AppSnackbar payload={feedback} onDismiss={() => setFeedback(null)} />
    </AppScreen>
  );
}

function TabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      hitSlop={6}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
        {label}
      </Text>
      <View style={[styles.tabIndicator, selected && styles.tabIndicatorOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  filterButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.light.background,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
  },
  filterBadgeText: {
    color: colors.light.surface,
    fontFamily: typography.bold,
    fontSize: 10,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    minHeight: 38,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
  },
  tab: {
    minHeight: 38,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  tabLabel: {
    color: colors.light.muted,
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  tabLabelSelected: { color: colors.light.text },
  tabIndicator: {
    height: 3,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
  },
  tabIndicatorOn: { backgroundColor: colors.brand },
  feed: {
    flex: 1,
    minHeight: 0,
  },
  error: { color: colors.danger },
  pressed: { opacity: 0.72 },
});

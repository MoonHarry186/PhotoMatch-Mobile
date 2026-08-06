import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppBanner,
  AppSnackbar,
  ErrorState,
  type SnackbarPayload,
} from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import {
  captureCurrentLocation,
  getLocationPermissionState,
  requestLocationPermission,
} from '@/features/nearby/location-permission';
import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { useOptionalTheme } from '@/providers/theme-provider';
import { queryKeys } from '@/services/api/query-keys';
import { useNavigationStore } from '@/stores/navigation.store';
import { colors, radius, spacing, typography } from '@/theme';

import { DiscoveryCardSkeleton, DiscoveryCardStack } from './discovery-card';
import {
  DiscoveryEmptyState,
  DiscoveryErrorState,
} from './discovery-empty-state';
import { DiscoveryFilterSheet } from './discovery-filter-sheet';
import { DiscoveryHeader } from './discovery-header';
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
  const { locale, t } = useI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
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
    if (visibleCandidates.length <= 3 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    visibleCandidates.length,
  ]);

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
            ? t('discovery.feedback.interestSent')
            : t('discovery.feedback.skipped', { days: LEFT_COOLDOWN_DAYS }),
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
        throw new Error(locationPermissionMessage(permission, locale));
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
    return <ErrorState title={t('discovery.roleUnknown')} />;

  return (
    <AppScreen
      scroll={activeView !== 'feed'}
      contentStyle={
        activeView === 'feed' || activeView === 'matches'
          ? styles.immersiveContent
          : undefined
      }
      safeStyle={
        activeView === 'feed' || activeView === 'matches'
          ? styles.immersiveSafe
          : undefined
      }
      safeEdges={
        activeView === 'feed' || activeView === 'matches'
          ? ['top', 'left', 'right']
          : undefined
      }
    >
      <StatusBar
        style={
          activeView === 'feed' || activeView === 'matches' ? 'light' : 'auto'
        }
      />
      <AppBanner
        visible={bannerVisible && role === 'PHOTOGRAPHER'}
        title={t('discovery.setup.title')}
        message={t('discovery.setup.message')}
        actions={[
          {
            label: t('discovery.setup.now'),
            onPress: () => {
              setBannerVisible(false);
              router.push('/(details)/profile/edit');
            },
          },
          {
            label: t('discovery.setup.later'),
            onPress: () => setBannerVisible(false),
          },
        ]}
      />
      {activeView === 'feed' ? (
        <View style={styles.immersiveFeed}>
          <View
            pointerEvents="none"
            style={[styles.ambientGlow, styles.ambientGlowPrimary]}
          />
          <View
            pointerEvents="none"
            style={[styles.ambientGlow, styles.ambientGlowSecondary]}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              colors.discovery.scrimMedium,
              colors.discovery.scrimLight,
              'transparent',
            ]}
            locations={[0, 0.52, 1]}
            style={styles.headerScrim}
          />
          <DiscoveryHeader
            activeFilterCount={activeFilterCount}
            activeTab="feed"
            onOpenFilters={() => setFilterVisible(true)}
            onSelectTab={(tab) => setView(tab === 'feed' ? 'feed' : 'matches')}
          />

          <View style={styles.feed}>
            {swipeError ? (
              <Text accessibilityRole="alert" style={styles.errorOverlay}>
                {relationshipErrorMessage(swipeError, locale) ??
                  getUserErrorMessage(swipeError, locale)}
              </Text>
            ) : null}
            {candidates.isPending ? (
              <DiscoveryCardSkeleton />
            ) : candidates.isError ? (
              <DiscoveryErrorState onRetry={() => void candidates.refetch()} />
            ) : current ? (
              <DiscoveryCardStack
                candidates={visibleCandidates.slice(0, 3)}
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
              <DiscoveryCardSkeleton />
            ) : (
              <DiscoveryEmptyState
                onAdjustFilters={() => setFilterVisible(true)}
                onRetry={() => void candidates.refetch()}
              />
            )}
          </View>
        </View>
      ) : activeView === 'matches' ? (
        <View style={styles.connectionView}>
          <LinearGradient
            pointerEvents="none"
            colors={[
              colors.discovery.scrim,
              colors.discovery.scrimLight,
              'transparent',
            ]}
            locations={[0, 0.58, 1]}
            style={styles.connectionScrim}
          />
          <DiscoveryHeader
            activeFilterCount={activeFilterCount}
            activeTab="matches"
            onOpenFilters={() => setFilterVisible(true)}
            onSelectTab={(tab) => setView(tab === 'feed' ? 'feed' : 'matches')}
          />
          <View style={styles.connectionBody}>
            <MatchList dark scope={scope} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: palette.text }]}
            >
              {role === 'CUSTOMER'
                ? t('discovery.tab.feed')
                : t('discovery.tab.interests')}
            </Text>
          </View>
          <View accessibilityRole="tablist" style={styles.tabs}>
            {role === 'CUSTOMER' ? (
              <TabButton
                palette={palette}
                label={t('discovery.tab.feed')}
                selected={false}
                onPress={() => setView('feed')}
              />
            ) : (
              <TabButton
                palette={palette}
                label={t('discovery.tab.interests')}
                selected={activeView === 'interests'}
                onPress={() => setView('interests')}
              />
            )}
            <TabButton
              palette={palette}
              label={t('discovery.tab.matches')}
              selected={false}
              onPress={() => setView('matches')}
            />
          </View>

          {activeView === 'interests' ? (
            <IncomingInterests
              scope={scope}
              onFeedback={(message) => setFeedback({ message })}
            />
          ) : (
            <MatchList scope={scope} />
          )}
        </>
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
  palette,
  onPress,
}: {
  label: string;
  selected: boolean;
  palette: (typeof colors)['light'] | (typeof colors)['dark'];
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
      <Text
        style={[
          styles.tabLabel,
          { color: selected ? palette.text : palette.muted },
        ]}
      >
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
    fontFamily: typography.bold,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  immersiveContent: {
    padding: 0,
    gap: 0,
    backgroundColor: colors.dark.background,
  },
  immersiveSafe: {
    backgroundColor: colors.dark.background,
  },
  immersiveFeed: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: colors.dark.background,
  },
  connectionView: {
    minHeight: '100%',
    position: 'relative',
    paddingTop: 72,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.dark.background,
  },
  connectionScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 180,
  },
  connectionBody: {
    flexGrow: 1,
  },
  ambientGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.12,
  },
  ambientGlowPrimary: {
    top: '26%',
    left: -120,
    backgroundColor: colors.brand,
  },
  ambientGlowSecondary: {
    right: -120,
    bottom: '22%',
    backgroundColor: colors.purple,
  },
  headerScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 148,
    zIndex: 4,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    minHeight: 38,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    minHeight: 38,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  tabLabel: {
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  tabLabelSelected: {},
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
  errorOverlay: {
    position: 'absolute',
    top: 112,
    right: spacing.lg,
    left: spacing.lg,
    zIndex: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.discovery.warningScrim,
    color: colors.onBrand,
    textAlign: 'center',
  },
  pressed: { opacity: 0.72 },
});

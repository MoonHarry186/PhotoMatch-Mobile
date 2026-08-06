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
import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { useTheme } from '@/providers/theme-provider';
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

type ThemePalette = (typeof colors)['light'] | (typeof colors)['dark'];

export function NearbyScreen() {
  const session = useSession();
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
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
  const activeChips = filterChips(filters, services.data ?? [], t);

  if (!user?.currentRoleId || !role)
    return <ErrorState title={t('role.current')} />;

  return (
    <AppScreen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.text }]}
          >
            {t('nearby.title')}
          </Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            {t('nearby.subtitle')}
          </Text>
        </View>
        <Button
          label={t('nearby.filter')}
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
            label={t('nearby.clearFilters')}
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

      <Text
        accessibilityRole="header"
        style={[styles.sectionTitle, { color: palette.text }]}
      >
        {t('nearby.sectionTitle')}
      </Text>
      {nearby.isPending ? (
        <LoadingState label={t('nearby.loading')} />
      ) : nearby.isError ? (
        <ErrorState
          title={t('nearby.loadErrorTitle')}
          description={t('nearby.loadErrorMessage')}
          primaryActionLabel={t('common.retry')}
          onPrimaryAction={() => void nearby.refetch()}
        />
      ) : items.length ? (
        <View style={styles.list}>
          {items.map((item) => (
            <NearbyCandidateCard
              key={item.userRoleId}
              item={item}
              palette={palette}
              t={t}
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
              label={t('nearby.loadMore')}
              variant="secondary"
              loading={nearby.isFetchingNextPage}
              onPress={() => void nearby.fetchNextPage()}
            />
          ) : null}
        </View>
      ) : (
        <EmptyState
          title={t('nearby.emptyTitle')}
          message={t('nearby.emptyMessage')}
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
  palette,
  t,
  onPress,
}: {
  item: NearbyCandidate;
  palette: ThemePalette;
  t: ReturnType<typeof useI18n>['t'];
  onPress: () => void;
}) {
  const displayName = item.displayName || t('discovery.matches.defaultName');
  const distance = item.distance || t('nearby.distanceUnknown');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('nearby.openProfile', {
        name: displayName,
        distance,
      })}
      onPress={onPress}
      style={[styles.card, { backgroundColor: palette.surface }]}
    >
      <View
        style={[
          styles.avatarPlaceholder,
          { backgroundColor: palette.infoContainer },
        ]}
      >
        <Text style={[styles.avatarText, { color: palette.info }]}>
          {displayName.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {displayName}
        </Text>
        {item.headline ? (
          <Text
            numberOfLines={2}
            style={[styles.subtitle, { color: palette.muted }]}
          >
            {item.headline}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <StatusBadge label={distance} />
          {item.verified ? (
            <StatusBadge label={t('nearby.verified')} tone="success" />
          ) : null}
          {item.availabilityStatus === 'AVAILABLE' ? (
            <StatusBadge label={t('nearby.available')} tone="success" />
          ) : null}
        </View>
      </View>
      <Text style={[styles.chevron, { color: palette.info }]}>›</Text>
    </Pressable>
  );
}

function filterChips(
  filters: NearbyFilters,
  services: { id: string; name: string }[],
  t: ReturnType<typeof useI18n>['t'],
) {
  const serviceNames = new Map(services.map((item) => [item.id, item.name]));
  return [
    ...filters.serviceIds.map((id) => ({
      key: `service:${id}`,
      label: serviceNames.get(id) ?? t('nearby.service'),
    })),
    ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
      ? [
          {
            key: 'price',
            label: t('nearby.price', {
              min: filters.minPrice ?? 0,
              max: filters.maxPrice ?? '∞',
            }),
          },
        ]
      : []),
    ...(filters.radiusKm !== defaultNearbyFilters.radiusKm
      ? [{ key: 'radius', label: `${filters.radiusKm} km` }]
      : []),
    ...(filters.availableOnly
      ? [{ key: 'available', label: t('nearby.available') }]
      : []),
    ...(filters.verifiedOnly
      ? [{ key: 'verified', label: t('nearby.verified') }]
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
    fontFamily: typography.bold,
    fontSize: 28,
  },
  subtitle: { lineHeight: 20 },
  sectionTitle: {
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
    ...elevation.card,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  avatarText: {
    fontFamily: typography.bold,
    fontSize: 22,
  },
  cardContent: { flex: 1, gap: spacing.xs },
  cardTitle: {
    fontFamily: typography.bold,
    fontSize: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chevron: { fontSize: 28 },
});

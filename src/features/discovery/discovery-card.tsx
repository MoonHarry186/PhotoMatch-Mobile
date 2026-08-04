import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { useMemo, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type {
  PortfolioItemResponse,
  PublicProfileResponse,
} from '@/generated/api/types.gen';
import { useI18n } from '@/i18n/i18n-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, gradients, radius, spacing, typography } from '@/theme';

import { profileApi } from '../profile/profile.api';
import { discoveryApi } from './discovery.api';
import { DiscoveryPortfolioGallery } from './discovery-portfolio-gallery';
import type { DiscoveryCandidate } from './discovery.types';

const ACTION_THRESHOLD = 96;
const TINDER_HEART = '#FF4458';

type Scope = { userId: string; roleId: string };

export function DiscoveryCardStack({
  candidates,
  scope,
  pending,
  onAction,
  onOpenProfile,
}: {
  candidates: DiscoveryCandidate[];
  scope: Scope;
  pending: boolean;
  onAction: (direction: 'LEFT' | 'RIGHT') => void;
  onOpenProfile: () => void;
}) {
  const current = candidates[0];
  const profileQueries = useQueries({
    queries: candidates.slice(0, 3).map((candidate) => ({
      queryKey: queryKeys.publicProfile(candidate.userRoleId),
      queryFn: () => profileApi.publicProfile(candidate.userRoleId),
      staleTime: 5 * 60_000,
    })),
  });
  const portfolio = useInfiniteQuery({
    queryKey: current
      ? queryKeys.publicPortfolio(current.userRoleId)
      : ['public', 'portfolio', 'missing'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      profileApi.publicPortfolio(current!.userRoleId, pageParam, 8),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(current),
    staleTime: 5 * 60_000,
  });
  const profile = profileQueries[0]?.data as PublicProfileResponse | undefined;
  const portfolioItems =
    portfolio.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={styles.cardStack}>
      {candidates.slice(1, 3).map((candidate, index) => (
        <StackPreview
          key={candidate.userRoleId}
          candidate={candidate}
          index={index}
        />
      ))}
      {current ? (
        <DiscoveryCard
          key={current.userRoleId}
          candidate={current}
          scope={scope}
          pending={pending}
          profile={profile}
          portfolioItems={portfolioItems}
          portfolioHasNext={portfolio.hasNextPage}
          onLoadMorePortfolio={() => void portfolio.fetchNextPage()}
          onAction={onAction}
          onOpenProfile={onOpenProfile}
        />
      ) : null}
    </View>
  );
}

function StackPreview({
  candidate,
  index,
}: {
  candidate: DiscoveryCandidate;
  index: number;
}) {
  const { t } = useI18n();
  return (
    <View
      accessibilityElementsHidden
      pointerEvents="none"
      style={[
        styles.stackPreview,
        {
          top: (index + 1) * 10,
          left: (index + 1) * 12,
          right: (index + 1) * 12,
        },
      ]}
    >
      <LinearGradient
        colors={gradients.brand}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.previewScrim} />
      <Text numberOfLines={1} style={styles.previewName}>
        {candidate.displayName || t('discovery.default.photographer')}
      </Text>
    </View>
  );
}

export function DiscoveryCard({
  candidate,
  scope,
  pending,
  profile,
  portfolioItems,
  portfolioHasNext = false,
  onLoadMorePortfolio,
  onAction,
  onOpenProfile,
}: {
  candidate: DiscoveryCandidate;
  scope: Scope;
  pending: boolean;
  profile?: PublicProfileResponse;
  portfolioItems?: PortfolioItemResponse[];
  portfolioHasNext?: boolean;
  onLoadMorePortfolio?: () => void;
  onAction: (direction: 'LEFT' | 'RIGHT') => void;
  onOpenProfile: () => void;
}) {
  const { locale, t } = useI18n();
  const translationX = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const avatar = useQuery({
    queryKey: queryKeys.assetUrl(scope, candidate.avatarAssetId ?? 'no-avatar'),
    queryFn: ({ signal }) =>
      discoveryApi.assetUrl(candidate.avatarAssetId!, signal),
    enabled: Boolean(candidate.avatarAssetId),
    staleTime: 4 * 60_000,
  });
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!pending)
        .activeOffsetX([-12, 12])
        .failOffsetY([-28, 28])
        .runOnJS(true)
        .onUpdate((event) => {
          translationX.set(event.translationX);
        })
        .onEnd((event) => {
          if (Math.abs(event.translationX) < ACTION_THRESHOLD) {
            translationX.set(
              reduceMotion ? 0 : withSpring(0, { damping: 20, stiffness: 220 }),
            );
            return;
          }
          translationX.set(
            reduceMotion
              ? 0
              : withTiming(Math.sign(event.translationX) * 24, {
                  duration: 120,
                }),
          );
          onAction(event.translationX > 0 ? 'RIGHT' : 'LEFT');
          translationX.set(
            reduceMotion ? 0 : withSpring(0, { damping: 20, stiffness: 220 }),
          );
        }),
    [onAction, pending, reduceMotion, translationX],
  );
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.get() },
      { rotate: `${translationX.get() / 32}deg` },
    ],
  }));
  const interestStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, translationX.get() / ACTION_THRESHOLD)),
  }));
  const rejectStampStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -translationX.get() / ACTION_THRESHOLD)),
  }));
  const displayName =
    candidate.displayName || t('discovery.default.photographer');
  const subtitle =
    candidate.headline ??
    profile?.photographerProfile?.headline ??
    profile?.activityFields[0]?.name ??
    t('discovery.card.defaultHeadline');
  const rating = profile?.rating;
  const yearsExperience = profile?.photographerProfile?.yearsExperience;
  const primaryField = profile?.activityFields[0]?.name;
  const firstService = profile?.services.find(
    (service) => service.serviceMode === 'OFFERED',
  );
  const price = firstService ? priceLabel(firstService, locale) : null;

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          accessibilityLabel={[
            t('discovery.card.profileLabel', {
              name: displayName,
              distance: candidate.distance ? `, ${candidate.distance}` : '',
            }),
          ]
            .filter(Boolean)
            .join(', ')}
          style={[styles.card, animatedStyle]}
        >
          <DiscoveryPortfolioGallery
            displayName={displayName}
            fallbackUrl={avatar.data}
            items={portfolioItems}
            hasNextPage={portfolioHasNext}
            disabled={pending}
            onLoadMore={onLoadMorePortfolio}
          />

          <Animated.View
            pointerEvents="none"
            style={[styles.stamp, styles.interestStamp, interestStampStyle]}
          >
            <Text style={[styles.stampText, styles.interestStampText]}>
              {t('discovery.card.interestStamp')}
            </Text>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={[styles.stamp, styles.rejectStamp, rejectStampStyle]}
          >
            <Text style={[styles.stampText, styles.rejectStampText]}>
              {t('discovery.card.skipStamp')}
            </Text>
          </Animated.View>

          <LinearGradient
            pointerEvents="none"
            colors={gradients.discoveryOverlay}
            locations={[0, 0.44, 1]}
            style={styles.overlay}
          />
          {candidate.distance ? (
            <View style={styles.distanceBadge} pointerEvents="none">
              <SymbolView
                name={{
                  ios: 'location.fill',
                  android: 'location_on',
                  web: 'location_on',
                }}
                size={15}
                tintColor={colors.discovery.interest}
              />
              <Text style={styles.distanceText}>
                {t('discovery.card.distance', {
                  distance: candidate.distance,
                })}
              </Text>
            </View>
          ) : null}
          <View pointerEvents="none" style={styles.content}>
            <View style={styles.identityRow}>
              <Text accessibilityRole="header" style={styles.name}>
                {displayName}
              </Text>
              {candidate.verified ? (
                <SymbolView
                  name={{
                    ios: 'checkmark.seal.fill',
                    android: 'verified',
                    web: 'verified',
                  }}
                  size={22}
                  tintColor={colors.discovery.info}
                />
              ) : null}
            </View>
            <Text numberOfLines={2} style={styles.headline}>
              {subtitle}
            </Text>
            <View style={styles.profileMeta}>
              {rating && rating.count > 0 ? (
                <ProfileChip
                  label={`★ ${rating.average.toFixed(1)} (${rating.count})`}
                />
              ) : null}
              {yearsExperience != null ? (
                <ProfileChip
                  label={t('discovery.card.experience', {
                    years: yearsExperience,
                  })}
                />
              ) : null}
              {primaryField ? <ProfileChip label={primaryField} /> : null}
              {price ? <ProfileChip label={price} /> : null}
            </View>
            <View style={styles.badges}>
              {candidate.availabilityStatus === 'AVAILABLE' ? (
                <ProfileChip
                  icon={{ ios: 'bolt.fill', android: 'bolt', web: 'bolt' }}
                  label={t('discovery.card.available')}
                />
              ) : null}
              {profile?.city?.name ? (
                <ProfileChip label={profile.city.name} />
              ) : null}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
      <View style={styles.actions}>
        <RoundAction
          accessibilityLabel={t('discovery.card.skip', { name: displayName })}
          color="#FFFFFF"
          icon={{ ios: 'xmark', android: 'close', web: 'close' }}
          disabled={pending}
          onPress={() => onAction('LEFT')}
        />
        <RoundAction
          accessibilityLabel={t('discovery.card.viewProfile', {
            name: displayName,
          })}
          color={colors.discovery.info}
          icon={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}
          disabled={pending}
          small
          onPress={onOpenProfile}
        />
        <RoundAction
          accessibilityLabel={t('discovery.card.interest', {
            name: displayName,
          })}
          color={TINDER_HEART}
          icon={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
          large
          loading={pending}
          onPress={() => onAction('RIGHT')}
        />
      </View>
    </View>
  );
}

export function DiscoveryCardSkeleton() {
  const { t } = useI18n();
  return (
    <View
      accessibilityLabel={t('discovery.card.loading')}
      style={styles.skeletonRoot}
    >
      <LinearGradient
        colors={gradients.brand}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.skeletonScrim} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, styles.skeletonName]} />
        <View style={[styles.skeletonLine, styles.skeletonSubtitle]} />
        <View style={[styles.skeletonLine, styles.skeletonChip]} />
      </View>
      <View style={styles.skeletonActions}>
        <View style={styles.skeletonAction} />
        <View style={[styles.skeletonAction, styles.skeletonActionSmall]} />
        <View style={[styles.skeletonAction, styles.skeletonActionPrimary]} />
      </View>
    </View>
  );
}

type SymbolName = Exclude<ComponentProps<typeof SymbolView>['name'], string>;

function ProfileChip({ icon, label }: { icon?: SymbolName; label: string }) {
  return (
    <View style={styles.chip}>
      {icon ? (
        <SymbolView
          name={icon}
          size={15}
          tintColor={colors.discovery.actionSurface}
        />
      ) : null}
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function RoundAction({
  accessibilityLabel,
  color,
  icon,
  disabled,
  large = false,
  loading = false,
  small = false,
  onPress,
}: {
  accessibilityLabel: string;
  color: string;
  icon: SymbolName;
  disabled?: boolean;
  large?: boolean;
  loading?: boolean;
  small?: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={[
        styles.actionCircle,
        small && styles.actionCircleSmall,
        large && styles.actionCircleLarge,
        (disabled || loading) && styles.actionDisabled,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        hitSlop={6}
        style={({ pressed }) => [
          styles.roundAction,
          pressed && styles.actionPressed,
        ]}
        onPress={onPress}
      >
        {loading ? (
          <ActivityIndicator color={color} />
        ) : (
          <SymbolView
            name={icon}
            size={large ? 34 : small ? 25 : 32}
            tintColor={color}
          />
        )}
      </Pressable>
    </View>
  );
}

function priceLabel(
  service: NonNullable<PublicProfileResponse['services'][number]>,
  locale: 'vi' | 'en',
) {
  if (service.minPrice == null && service.maxPrice == null) return null;
  const min = service.minPrice?.toLocaleString(
    locale === 'vi' ? 'vi-VN' : 'en-US',
  );
  const max = service.maxPrice?.toLocaleString(
    locale === 'vi' ? 'vi-VN' : 'en-US',
  );
  return `${min ?? ''}${max ? ` – ${max}` : ''} ${service.currency ?? 'VND'}`;
}

const styles = StyleSheet.create({
  cardStack: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  stackPreview: {
    position: 'absolute',
    bottom: 0,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.dark.surface,
  },
  previewScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.34)',
  },
  previewName: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    left: spacing.lg,
    color: 'rgba(255, 255, 255, 0.62)',
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  root: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    zIndex: 2,
  },
  card: {
    flex: 1,
    minHeight: 420,
    overflow: 'hidden',
    backgroundColor: colors.dark.background,
  },
  overlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '72%',
  },
  distanceBadge: {
    position: 'absolute',
    top: 76,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.full,
    backgroundColor: 'rgba(2, 6, 23, 0.48)',
  },
  distanceText: {
    color: '#FFFFFF',
    fontFamily: typography.medium,
    fontSize: 12,
  },
  content: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: 128,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: {
    flexShrink: 1,
    color: colors.discovery.actionSurface,
    fontFamily: typography.bold,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  headline: {
    color: colors.discovery.actionSurface,
    fontFamily: typography.medium,
    fontSize: 16,
    lineHeight: 23,
  },
  profileMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.discovery.chipSurface,
  },
  chipText: {
    color: colors.discovery.actionSurface,
    fontFamily: typography.semibold,
    fontSize: 12,
  },
  stamp: {
    position: 'absolute',
    top: 48,
    zIndex: 2,
    borderWidth: 4,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    transform: [{ rotate: '-12deg' }],
  },
  interestStamp: { left: spacing.xl, borderColor: colors.discovery.interest },
  rejectStamp: {
    right: spacing.xl,
    borderColor: colors.discovery.reject,
    transform: [{ rotate: '12deg' }],
  },
  stampText: { fontFamily: typography.bold, fontSize: 26, letterSpacing: 1.4 },
  interestStampText: { color: colors.discovery.interest },
  rejectStampText: { color: colors.discovery.reject },
  actions: {
    position: 'absolute',
    right: 0,
    bottom: spacing.lg,
    left: 0,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 70,
    paddingHorizontal: spacing.xl,
  },
  actionCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(45, 40, 39, 0.98)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.42,
    shadowRadius: 12,
    elevation: 8,
  },
  actionCircleSmall: { width: 56, height: 56 },
  actionCircleLarge: {
    width: 72,
    height: 72,
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 8,
  },
  roundAction: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  actionPressed: { transform: [{ scale: 0.91 }], opacity: 0.9 },
  actionDisabled: { opacity: 0.44 },
  skeletonRoot: {
    flex: 1,
    minHeight: 420,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  skeletonScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.38)',
  },
  skeletonContent: { gap: spacing.sm, padding: spacing.xl, paddingBottom: 128 },
  skeletonLine: {
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  skeletonName: { width: '58%', height: 34 },
  skeletonSubtitle: { width: '78%', height: 20 },
  skeletonChip: { width: 120, height: 30 },
  skeletonActions: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.lg,
    left: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skeletonAction: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
  },
  skeletonActionSmall: { width: 54, height: 54 },
  skeletonActionPrimary: {
    width: 66,
    height: 66,
    backgroundColor: 'rgba(37, 99, 235, 0.6)',
  },
});

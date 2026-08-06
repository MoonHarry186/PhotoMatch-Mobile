import { useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';

import type { PortfolioItemResponse } from '@/generated/api/types.gen';
import { useI18n } from '@/i18n/i18n-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, gradients, radius, spacing, typography } from '@/theme';

import { profileApi } from '../profile/profile.api';

type Props = {
  displayName: string;
  fallbackUrl?: string;
  items?: PortfolioItemResponse[];
  hasNextPage?: boolean;
  disabled?: boolean;
  onLoadMore?: () => void;
};

export function DiscoveryPortfolioGallery({
  displayName,
  fallbackUrl,
  items = [],
  hasNextPage = false,
  disabled = false,
  onLoadMore,
}: Props) {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const mediaItems = useMemo(
    () =>
      items.length
        ? items
        : fallbackUrl
          ? [{ id: 'avatar-fallback', assetId: 'avatar-fallback' }]
          : [],
    [fallbackUrl, items],
  );
  const assetQueries = useQueries({
    queries: mediaItems.map((item) => ({
      queryKey: queryKeys.public('asset', { assetId: item.assetId }),
      queryFn: () => profileApi.assetUrl(item.assetId),
      staleTime: 4 * 60_000,
      enabled: item.assetId !== 'avatar-fallback',
    })),
  });

  const activeUrl =
    assetQueries[activeIndex]?.data ??
    (activeIndex === 0 ? fallbackUrl : undefined);
  const hasMultipleItems = mediaItems.length > 1 || hasNextPage;

  const goToPrevious = () => {
    if (activeIndex > 0) setActiveIndex((index) => index - 1);
  };

  const goToNext = () => {
    if (activeIndex < mediaItems.length - 1) {
      setActiveIndex((index) => index + 1);
      return;
    }
    if (hasNextPage) {
      onLoadMore?.();
    }
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      accessibilityLabel={t('discovery.gallery.photos', { name: displayName })}
    >
      {activeUrl ? (
        <Image
          source={{ uri: activeUrl }}
          accessibilityLabel={t('discovery.gallery.portfolioPhoto', {
            name: displayName,
          })}
          cachePolicy="memory"
          contentFit="cover"
          enforceEarlyResizing
          recyclingKey={`${displayName}-${activeIndex}`}
          style={StyleSheet.absoluteFill}
          transition={180}
        />
      ) : (
        <LinearGradient
          colors={gradients.brand}
          style={[StyleSheet.absoluteFill, styles.placeholder]}
        >
          <Text style={styles.initial}>
            {displayName.slice(0, 1).toUpperCase()}
          </Text>
          <Text style={styles.placeholderLabel}>
            {items.length
              ? t('discovery.gallery.loadingPortfolio')
              : t('discovery.gallery.noPublicPhotos')}
          </Text>
        </LinearGradient>
      )}

      <View pointerEvents="none" style={styles.progressRow}>
        {hasMultipleItems ? (
          <>
            {mediaItems.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.progressTrack,
                  index === activeIndex && styles.progressActive,
                ]}
              />
            ))}
            {hasNextPage ? <View style={styles.progressTrack} /> : null}
          </>
        ) : null}
      </View>

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('discovery.gallery.previous', {
            name: displayName,
          })}
          accessibilityState={{ disabled }}
          disabled={disabled}
          style={styles.previousZone}
          onPress={goToPrevious}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('discovery.gallery.next', {
            name: displayName,
          })}
          accessibilityState={{ disabled }}
          disabled={disabled}
          style={styles.nextZone}
          onPress={goToNext}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  initial: {
    color: colors.discovery.actionSurface,
    fontFamily: typography.bold,
    fontSize: 96,
  },
  placeholderLabel: {
    color: colors.discovery.whiteStrong,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  progressRow: {
    position: 'absolute',
    top: 64,
    right: '38%',
    left: '38%',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: radius.full,
    backgroundColor: colors.discovery.whiteMedium,
  },
  progressActive: { backgroundColor: colors.onBrand },
  previousZone: {
    position: 'absolute',
    top: 64,
    bottom: 112,
    left: 0,
    width: '30%',
  },
  nextZone: {
    position: 'absolute',
    top: 64,
    right: 0,
    bottom: 112,
    width: '30%',
  },
});

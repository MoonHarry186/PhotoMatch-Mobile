import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { ReviewCard, RatingSummary, StatusBadge } from '@/components/domain';
import { AppScreen } from '@/components/layout/app-screen';
import { MediaPlaceholder } from '@/components/media/media-components';
import { Button } from '@/components/ui';
import type { PortfolioItemResponse } from '@/generated/api/types.gen';
import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { useTheme } from '@/providers/theme-provider';
import { profileApi } from './profile.api';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';

function AssetImage({
  assetId,
  onPress,
  avatar = false,
}: {
  assetId: string;
  onPress?: (url: string) => void;
  avatar?: boolean;
}) {
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const queryClient = useQueryClient();
  const assetKey = queryKeys.public('asset', { assetId });
  const asset = useQuery({
    queryKey: assetKey,
    queryFn: () => profileApi.assetUrl(assetId),
    retry: 1,
  });
  if (!asset.data)
    return (
      <MediaPlaceholder
        label={
          asset.isPending
            ? t('profile.imageLoading')
            : t('profile.imageUnavailable')
        }
      />
    );
  const image = (
    <Image
      source={{ uri: asset.data }}
      style={[
        avatar ? styles.avatarImage : styles.portfolioImage,
        { backgroundColor: palette.surfaceVariant },
      ]}
      contentFit="cover"
      transition={180}
      onError={() => void queryClient.invalidateQueries({ queryKey: assetKey })}
    />
  );
  return onPress ? (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={t('profile.openPortfolioImage')}
      onPress={() => onPress(asset.data!)}
    >
      {image}
    </Pressable>
  ) : (
    image
  );
}

function PortfolioGrid({ items }: { items: PortfolioItemResponse[] }) {
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.gridItem}>
            <AssetImage assetId={item.assetId} onPress={setPreview} />
            {item.title ? (
              <Text
                numberOfLines={1}
                style={[styles.caption, { color: palette.muted }]}
              >
                {item.title}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      <Modal
        visible={Boolean(preview)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <Pressable
          style={[
            styles.previewBackdrop,
            { backgroundColor: colors.discovery.scrim },
          ]}
          onPress={() => setPreview(null)}
        >
          {preview ? (
            <Image
              source={{ uri: preview }}
              style={styles.previewImage}
              contentFit="contain"
            />
          ) : null}
          <Text style={[styles.previewHint, { color: palette.text }]}>
            {t('profile.closePreview')}
          </Text>
        </Pressable>
      </Modal>
    </>
  );
}

export function PublicProfileScreen({
  userRoleId: propId,
}: { userRoleId?: string } = {}) {
  const params = useLocalSearchParams<{ id?: string; userRoleId?: string }>();
  const userRoleId = propId ?? params.userRoleId ?? params.id;
  const router = useRouter();
  const session = useSession();
  const { t, locale } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const profile = useQuery({
    queryKey: userRoleId
      ? queryKeys.publicProfile(userRoleId)
      : ['public', 'profile', 'missing'],
    queryFn: () => profileApi.publicProfile(userRoleId!),
    enabled: Boolean(userRoleId),
  });
  const portfolio = useInfiniteQuery({
    queryKey: userRoleId
      ? ['public', 'portfolio', userRoleId]
      : ['public', 'portfolio', 'missing'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      profileApi.publicPortfolio(userRoleId!, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userRoleId && profile.data?.role === 'PHOTOGRAPHER'),
  });
  const reviews = useInfiniteQuery({
    queryKey: userRoleId
      ? ['public', 'reviews', userRoleId]
      : ['public', 'reviews', 'missing'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => profileApi.reviews(userRoleId!, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userRoleId && profile.data?.role === 'PHOTOGRAPHER'),
  });
  if (!userRoleId || profile.isPending)
    return <LoadingState label={t('profile.loading')} />;
  if (profile.isError || !profile.data)
    return (
      <ErrorState
        title={t('profile.loadError')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void profile.refetch()}
      />
    );
  const isPhotographer = profile.data.role === 'PHOTOGRAPHER';
  const rating = profile.data.rating;
  const portfolioItems =
    portfolio.data?.pages.flatMap((page) => page.items) ?? [];
  const reviewItems = reviews.data?.pages.flatMap((page) => page.items) ?? [];
  const portfolioHasNext = Boolean(portfolio.hasNextPage);
  const reviewsHasNext = Boolean(reviews.hasNextPage);
  const isOwner =
    session.snapshot?.user.currentRoleId === profile.data.userRoleId;
  const currentRole = session.snapshot?.user.roles.find(
    (role) => role.id === session.snapshot?.user.currentRoleId,
  )?.code;
  const firstOfferedService = profile.data.services.find(
    (service) => service.serviceMode === 'OFFERED',
  );
  return (
    <AppScreen>
      <Button
        label={t('profile.back')}
        variant="ghost"
        onPress={() => router.back()}
      />
      {isPhotographer ? (
        <>
          <Section title={t('profile.portfolio')}>
            {portfolioItems.length ? (
              <PortfolioGrid items={portfolioItems} />
            ) : portfolio.isPending ? (
              <LoadingState label={t('profile.portfolioLoading')} />
            ) : (
              <EmptyState title={t('profile.portfolioEmpty')} />
            )}
            {portfolioHasNext ? (
              <Button
                label={t('profile.viewMorePhotos')}
                variant="secondary"
                onPress={() => void portfolio.fetchNextPage()}
                loading={portfolio.isFetchingNextPage}
              />
            ) : null}
          </Section>
          <Section title={t('profile.identity')}>
            <IdentityHeader profile={profile.data} />
          </Section>
          <Section title={t('profile.overallRating')}>
            {rating && rating.count > 0 ? (
              <RatingSummary value={rating.average} count={rating.count} />
            ) : (
              <Text style={[styles.muted, { color: palette.muted }]}>
                {t('profile.noPublicReviews')}
              </Text>
            )}
          </Section>
          <Section title={t('profile.expertiseAndPrice')}>
            <Text style={{ color: palette.text }}>
              {t('profile.expertise')}:{' '}
              {profile.data.activityFields
                .map((field) => field.name)
                .join(', ') || t('profile.notUpdated')}
            </Text>
            <Text style={{ color: palette.text }}>
              {t('profile.services')}:{' '}
              {profile.data.services
                .filter((service) => service.serviceMode === 'OFFERED')
                .map((service) => service.name)
                .join(', ') || t('profile.notUpdated')}
            </Text>
            <Text style={{ color: palette.text }}>
              {t('profile.referencePrice')}:{' '}
              {priceLabel(profile.data.services, t, locale)}
            </Text>
            <Text style={{ color: palette.text }}>
              {t('profile.experience')}:{' '}
              {profile.data.photographerProfile?.yearsExperience ??
                t('profile.notUpdated')}{' '}
              {locale === 'en' ? 'years' : 'năm'}
            </Text>
            <Text style={{ color: palette.text }}>
              {t('profile.status')}:{' '}
              {profile.data.photographerProfile?.availabilityStatus ??
                t('profile.notSpecified')}
            </Text>
          </Section>
          <Section title={t('profile.location')}>
            <Text style={{ color: palette.text }}>
              {profile.data.city?.name ?? t('profile.locationPrivate')}
            </Text>
          </Section>
          <Section title={t('profile.about')}>
            <Text style={{ color: palette.text }}>
              {profile.data.bio || t('profile.noBio')}
            </Text>
          </Section>
          <Section title={t('profile.publicReviews')}>
            {reviewItems.length ? (
              reviewItems.map((review) => (
                <ReviewCard
                  key={review.id}
                  author={review.customer?.displayName ?? t('profile.customer')}
                  rating={review.rating}
                  comment={review.comment}
                />
              ))
            ) : (
              <Text style={[styles.muted, { color: palette.muted }]}>
                {t('profile.noPublicReviews')}
              </Text>
            )}
            {reviewsHasNext ? (
              <Button
                label={t('profile.viewMoreReviews')}
                variant="secondary"
                onPress={() => void reviews.fetchNextPage()}
                loading={reviews.isFetchingNextPage}
              />
            ) : null}
          </Section>
        </>
      ) : (
        <>
          <IdentityHeader profile={profile.data} />
          <Section title={t('profile.about')}>
            <Text style={{ color: palette.text }}>
              {profile.data.bio || t('profile.noBio')}
            </Text>
          </Section>
        </>
      )}
      {isOwner ? (
        <Button
          label={
            isPhotographer ? t('profile.managePortfolio') : t('profile.edit')
          }
          onPress={() =>
            router.push(
              isPhotographer
                ? '/(details)/profile/portfolio'
                : '/(details)/profile/edit',
            )
          }
        />
      ) : (
        <>
          {isPhotographer &&
          currentRole === 'CUSTOMER' &&
          firstOfferedService ? (
            <Button
              label={t('profile.book')}
              onPress={() =>
                router.push({
                  pathname: '/(details)/booking/create',
                  params: {
                    photographerRoleId: profile.data.userRoleId,
                    serviceId: firstOfferedService.id,
                  },
                })
              }
            />
          ) : null}
          <Button
            label={t('profile.blockOrReport')}
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/(details)/trust',
                params: { targetUserId: profile.data.userRoleId },
              } as never)
            }
          />
          <Text style={[styles.ctaHint, { color: palette.muted }]}>
            {t('profile.eligibilityHint')}
          </Text>
        </>
      )}
    </AppScreen>
  );
}

function IdentityHeader({
  profile,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof profileApi.publicProfile>>>;
}) {
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.identityHeader}>
      {profile.avatarAssetId ? (
        <AssetImage assetId={profile.avatarAssetId} avatar />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            { backgroundColor: palette.infoContainer },
          ]}
        >
          <Text style={[styles.avatarLetter, { color: palette.info }]}>
            {(profile.displayName ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.flex}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: palette.text }]}
        >
          {profile.displayName ?? t('profile.publicProfile')}
        </Text>
        <Text style={[styles.muted, { color: palette.muted }]}>
          {profile.city?.name ?? t('profile.locationPrivate')}
        </Text>
        <StatusBadge
          label={
            profile.identityVerificationStatus === 'VERIFIED'
              ? t('profile.verifiedIdentity')
              : t('profile.unverifiedIdentity')
          }
          tone={
            profile.identityVerificationStatus === 'VERIFIED'
              ? 'success'
              : 'neutral'
          }
        />
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={[styles.section, { backgroundColor: palette.surface }]}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function priceLabel(
  services: PublicProfileScreenProps['services'],
  t: ReturnType<typeof useI18n>['t'],
  locale: 'vi' | 'en',
) {
  const offered = services.filter(
    (service) =>
      service.serviceMode === 'OFFERED' &&
      (service.minPrice != null || service.maxPrice != null),
  );
  if (!offered.length) return t('profile.notUpdated');
  const first = offered[0]!;
  const min = first.minPrice?.toLocaleString(
    locale === 'en' ? 'en-US' : 'vi-VN',
  );
  const max = first.maxPrice?.toLocaleString(
    locale === 'en' ? 'en-US' : 'vi-VN',
  );
  return `${min ?? ''}${max ? ` – ${max}` : ''} ${first.currency ?? 'VND'}${first.priceUnit ? `/${first.priceUnit}` : ''}`;
}

type PublicProfileScreenProps = {
  services: NonNullable<
    Awaited<ReturnType<typeof profileApi.publicProfile>>
  >['services'];
};

const styles = StyleSheet.create({
  identityHeader: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  flex: { flex: 1, gap: spacing.xs },
  title: {
    fontFamily: typography.bold,
    fontSize: 24,
  },
  muted: {},
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: typography.bold,
    fontSize: 30,
  },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridItem: { width: '31%', gap: spacing.xs },
  portfolioImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  caption: { fontSize: 12 },
  previewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  previewImage: { width: '100%', height: '80%' },
  previewHint: { marginTop: spacing.md },
  ctaHint: {
    textAlign: 'center',
    paddingBottom: spacing.lg,
  },
});

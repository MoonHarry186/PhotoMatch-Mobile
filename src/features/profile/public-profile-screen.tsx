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
import { useSession } from '@/providers/session-provider';
import { profileApi } from './profile.api';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';

function AssetImage({
  assetId,
  onPress,
  avatar = false,
}: {
  assetId: string;
  onPress: (url: string) => void;
  avatar?: boolean;
}) {
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
        label={asset.isPending ? 'Đang tải ảnh…' : 'Ảnh không khả dụng'}
      />
    );
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Mở ảnh portfolio"
      onPress={() => onPress(asset.data!)}
    >
      <Image
        source={{ uri: asset.data }}
        style={avatar ? styles.avatarImage : styles.portfolioImage}
        contentFit="cover"
        transition={180}
        onError={() =>
          void queryClient.invalidateQueries({ queryKey: assetKey })
        }
      />
    </Pressable>
  );
}

function PortfolioGrid({ items }: { items: PortfolioItemResponse[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.gridItem}>
            <AssetImage assetId={item.assetId} onPress={setPreview} />
            {item.title ? (
              <Text numberOfLines={1} style={styles.caption}>
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
          style={styles.previewBackdrop}
          onPress={() => setPreview(null)}
        >
          {preview ? (
            <Image
              source={{ uri: preview }}
              style={styles.previewImage}
              contentFit="contain"
            />
          ) : null}
          <Text style={styles.previewHint}>Chạm để đóng</Text>
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
    return <LoadingState label="Đang tải hồ sơ công khai…" />;
  if (profile.isError || !profile.data)
    return (
      <ErrorState
        title="Không thể tải hồ sơ"
        primaryActionLabel="Thử lại"
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
      <Button label="Quay lại" variant="ghost" onPress={() => router.back()} />
      {isPhotographer ? (
        <>
          <Section title="Portfolio">
            {portfolioItems.length ? (
              <PortfolioGrid items={portfolioItems} />
            ) : portfolio.isPending ? (
              <LoadingState label="Đang tải portfolio…" />
            ) : (
              <EmptyState title="Chưa có portfolio công khai" />
            )}
            {portfolioHasNext ? (
              <Button
                label="Xem thêm ảnh"
                variant="secondary"
                onPress={() => void portfolio.fetchNextPage()}
                loading={portfolio.isFetchingNextPage}
              />
            ) : null}
          </Section>
          <Section title="Danh tính và xác minh">
            <IdentityHeader profile={profile.data} />
          </Section>
          <Section title="Đánh giá tổng quan">
            {rating && rating.count > 0 ? (
              <RatingSummary value={rating.average} count={rating.count} />
            ) : (
              <Text style={styles.muted}>Chưa có đánh giá công khai</Text>
            )}
          </Section>
          <Section title="Chuyên môn và giá">
            <Text>
              Chuyên môn:{' '}
              {profile.data.activityFields
                .map((field) => field.name)
                .join(', ') || 'Chưa cập nhật'}
            </Text>
            <Text>
              Dịch vụ:{' '}
              {profile.data.services
                .filter((service) => service.serviceMode === 'OFFERED')
                .map((service) => service.name)
                .join(', ') || 'Chưa cập nhật'}
            </Text>
            <Text>Giá tham khảo: {priceLabel(profile.data.services)}</Text>
            <Text>
              Kinh nghiệm:{' '}
              {profile.data.photographerProfile?.yearsExperience ??
                'Chưa cập nhật'}{' '}
              năm
            </Text>
            <Text>
              Trạng thái:{' '}
              {profile.data.photographerProfile?.availabilityStatus ??
                'Chưa xác định'}
            </Text>
          </Section>
          <Section title="Khu vực">
            <Text>{profile.data.city?.name ?? 'Chưa công khai khu vực'}</Text>
          </Section>
          <Section title="Giới thiệu">
            <Text>
              {profile.data.bio || 'Người dùng chưa thêm phần giới thiệu.'}
            </Text>
          </Section>
          <Section title="Đánh giá công khai">
            {reviewItems.length ? (
              reviewItems.map((review) => (
                <ReviewCard
                  key={review.id}
                  author={review.customer?.displayName ?? 'Khách hàng'}
                  rating={review.rating}
                  comment={review.comment}
                />
              ))
            ) : (
              <Text style={styles.muted}>Chưa có đánh giá công khai</Text>
            )}
            {reviewsHasNext ? (
              <Button
                label="Xem thêm đánh giá"
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
          <Section title="Giới thiệu">
            <Text>
              {profile.data.bio || 'Người dùng chưa thêm phần giới thiệu.'}
            </Text>
          </Section>
        </>
      )}
      {isOwner ? (
        <Button
          label={isPhotographer ? 'Quản lý portfolio' : 'Chỉnh sửa hồ sơ'}
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
              label="Đặt lịch"
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
            label="Chặn hoặc báo cáo"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/(details)/trust',
                params: { targetUserId: profile.data.userRoleId },
              } as never)
            }
          />
          <Text style={styles.ctaHint}>
            Các thao tác chỉ hiển thị khi hồ sơ đủ điều kiện.
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
  return (
    <View style={styles.identityHeader}>
      {profile.avatarAssetId ? (
        <AssetImage
          assetId={profile.avatarAssetId}
          avatar
          onPress={() => undefined}
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarLetter}>
            {(profile.displayName ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={styles.title}>
          {profile.displayName ?? 'Hồ sơ công khai'}
        </Text>
        <Text style={styles.muted}>
          {profile.city?.name ?? 'Chưa công khai khu vực'}
        </Text>
        <StatusBadge
          label={
            profile.identityVerificationStatus === 'VERIFIED'
              ? 'Đã xác minh danh tính'
              : 'Chưa xác minh danh tính'
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
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function priceLabel(services: PublicProfileScreenProps['services']) {
  const offered = services.filter(
    (service) =>
      service.serviceMode === 'OFFERED' &&
      (service.minPrice != null || service.maxPrice != null),
  );
  if (!offered.length) return 'Chưa cập nhật';
  const first = offered[0]!;
  const min = first.minPrice?.toLocaleString('vi-VN');
  const max = first.maxPrice?.toLocaleString('vi-VN');
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
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 24,
  },
  muted: { color: colors.light.muted },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.infoContainer,
  },
  avatarLetter: {
    color: colors.brand,
    fontFamily: typography.bold,
    fontSize: 30,
  },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridItem: { width: '31%', gap: spacing.xs },
  portfolioImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.light.surfaceVariant,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.light.surfaceVariant,
  },
  caption: { fontSize: 12, color: colors.light.muted },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  previewImage: { width: '100%', height: '80%' },
  previewHint: { color: '#FFFFFF', marginTop: spacing.md },
  ctaHint: {
    color: colors.light.muted,
    textAlign: 'center',
    paddingBottom: spacing.lg,
  },
});

import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import {
  discoveryReasonLabels,
  missingLabels,
  portfolioWarning,
} from '@/features/onboarding/onboarding.model';
import { RoleSwitcher } from '@/features/profile/role-switcher';
import { useAppSnackbar } from '@/hooks/use-app-snackbar';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';

export default function ProfileRoute() {
  const session = useSession();
  const router = useRouter();
  const { showSnackbar } = useAppSnackbar();
  const user = session.snapshot?.user;
  const roleId = user?.currentRoleId;
  const role = user?.roles.find((item) => item.id === roleId)?.code;
  const scope = {
    userId: user?.id ?? 'unknown',
    roleId: roleId ?? null,
  };
  const profile = useQuery({
    queryKey: queryKeys.selfProfile(scope),
    queryFn: onboardingApi.self,
    enabled: Boolean(user),
  });
  const progress = useQuery({
    queryKey: queryKeys.onboarding(scope),
    queryFn: onboardingApi.progress,
    initialData: session.snapshot?.onboarding,
  });
  const settings = useQuery({
    queryKey: queryKeys.settings(scope),
    queryFn: onboardingApi.settings,
    enabled: Boolean(user),
  });
  const photographer = useQuery({
    queryKey: queryKeys.photographerProfile(scope),
    queryFn: onboardingApi.photographerSelf,
    enabled: role === 'PHOTOGRAPHER',
  });
  const portfolio = useQuery({
    queryKey: [
      'private',
      scope.userId,
      scope.roleId ?? 'no-role',
      'portfolio',
    ] as const,
    queryFn: ({ queryKey }) => onboardingApi.portfolio(queryKey[2]),
    enabled: role === 'PHOTOGRAPHER' && Boolean(roleId),
  });
  const avatarUrl = useQuery({
    queryKey: profile.data?.avatarAssetId
      ? queryKeys.assetUrl(scope, profile.data.avatarAssetId)
      : [...queryKeys.selfProfile(scope), 'no-avatar'],
    queryFn: () => onboardingApi.assetUrl(profile.data?.avatarAssetId ?? ''),
    enabled: Boolean(profile.data?.avatarAssetId),
  });

  const { errorUpdatedAt, isRefetchError, refetch } = profile;
  useEffect(() => {
    if (!isRefetchError) return;
    showSnackbar({
      message: 'Không thể cập nhật hồ sơ. Dữ liệu gần nhất vẫn được giữ.',
      actionLabel: 'Thử lại',
      onAction: () => void refetch(),
    });
  }, [errorUpdatedAt, isRefetchError, refetch, showSnackbar]);

  if (!user || profile.isPending || progress.isPending)
    return <LoadingState label="Đang tải hồ sơ…" />;
  if ((profile.isError && !profile.data) || !progress.data) {
    return (
      <ErrorState
        title="Không thể tải hồ sơ"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => {
          void profile.refetch();
          void progress.refetch();
        }}
      />
    );
  }
  const warning = portfolioWarning(
    role ?? 'CUSTOMER',
    portfolio.data?.length ?? 0,
  );
  return (
    <AppScreen>
      <View style={styles.header}>
        {avatarUrl.data ? (
          <Image source={{ uri: avatarUrl.data }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>
              {(profile.data?.displayName ?? user.email ?? '?')
                .charAt(0)
                .toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={styles.title}>
            {profile.data?.displayName ?? 'Hồ sơ của tôi'}
          </Text>
          <Text style={styles.muted}>{user.email}</Text>
          <Text style={styles.role}>
            {role === 'PHOTOGRAPHER' ? 'Photographer' : 'Khách hàng'}
          </Text>
        </View>
      </View>
      <RoleSwitcher
        roles={user.roles}
        userId={user.id}
        currentRoleId={roleId}
      />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hồ sơ riêng tư</Text>
        <Text>
          Ngày sinh: {profile.data?.dateOfBirth?.slice(0, 10) ?? 'Chưa có'}
        </Text>
        <Text>Thành phố: {profile.data?.city?.name ?? 'Chưa có'}</Text>
        <Text>Giới thiệu: {profile.data?.bio || 'Chưa có'}</Text>
        {role === 'PHOTOGRAPHER' ? (
          <>
            <Text>
              Nhận lịch:{' '}
              {photographer.data?.availabilityStatus ?? 'Chưa xác định'}
            </Text>
            <Text>Portfolio: {portfolio.data?.length ?? 0} ảnh</Text>
          </>
        ) : null}
        <Text>
          Hiển thị hồ sơ:{' '}
          {settings.data?.profileVisibilityEnabled ? 'Đang bật' : 'Đang tắt'}
        </Text>
      </View>
      <View
        style={[
          styles.card,
          progress.data.discoveryEligible
            ? styles.successCard
            : styles.warningCard,
        ]}
      >
        <Text style={styles.cardTitle}>
          {progress.data.discoveryEligible
            ? 'Đủ điều kiện Khám phá'
            : 'Chưa đủ điều kiện Khám phá'}
        </Text>
        {progress.data.missing.map((item) => (
          <Text key={item}>• {missingLabels[item] ?? item}</Text>
        ))}
        {progress.data.discoveryReasons.map((item) => (
          <Text key={item}>• {discoveryReasonLabels[item] ?? item}</Text>
        ))}
        {warning ? <Text style={styles.warning}>{warning}</Text> : null}
      </View>
      <Button
        label="Chỉnh sửa hồ sơ"
        onPress={() => router.push('/(details)/profile/edit')}
      />
      {role === 'PHOTOGRAPHER' ? (
        <Button
          label="Quản lý portfolio"
          variant="secondary"
          onPress={() => router.push('/(details)/profile/portfolio')}
        />
      ) : null}
      <Button
        label="Đăng xuất"
        variant="secondary"
        onPress={() => void session.signOut()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1 },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 24,
  },
  muted: { color: colors.light.muted },
  role: { color: colors.brand, fontFamily: typography.semibold },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light.infoContainer,
  },
  avatarLetter: {
    color: colors.brand,
    fontFamily: typography.bold,
    fontSize: 30,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: { color: colors.light.text, fontFamily: typography.semibold },
  successCard: { backgroundColor: colors.light.successContainer },
  warningCard: { backgroundColor: colors.light.warningContainer },
  warning: { color: colors.warning, fontFamily: typography.semibold },
});

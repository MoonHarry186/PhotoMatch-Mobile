import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import {
  discoveryReasonLabels,
  missingLabels,
  portfolioWarning,
} from '@/features/onboarding/onboarding.model';
import { RoleSwitcher } from '@/features/profile/role-switcher';
import { useAppSnackbar } from '@/hooks/use-app-snackbar';
import { useOptionalTheme } from '@/providers/theme-provider';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, elevation, radius, spacing, typography } from '@/theme';

type Palette = (typeof colors)['light'] | (typeof colors)['dark'];
type IconName = ComponentProps<typeof SymbolView>['name'];

export default function ProfileRoute() {
  const session = useSession();
  const router = useRouter();
  const theme = useOptionalTheme();
  const { showSnackbar } = useAppSnackbar();
  const user = session.snapshot?.user;
  const roleId = user?.currentRoleId;
  const role = user?.roles.find((item) => item.id === roleId)?.code;
  const scope = {
    userId: user?.id ?? 'unknown',
    roleId: roleId ?? null,
  };
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
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

  const displayName = profile.data.displayName ?? 'Hồ sơ của tôi';
  const roleLabel = role === 'PHOTOGRAPHER' ? 'Photographer' : 'Khách hàng';
  const warning = portfolioWarning(
    role ?? 'CUSTOMER',
    portfolio.data?.length ?? 0,
  );
  const profileCompletion = progress.data.discoveryEligible
    ? 'Đạt yêu cầu'
    : 'Cần hoàn thiện';
  const openSettings = () => router.push('/(details)/settings' as never);
  const openBack = () => {
    if (router.canGoBack()) router.back();
  };

  return (
    <AppScreen
      contentStyle={[styles.content, { backgroundColor: palette.background }]}
      header={
        <ProfileHeader
          palette={palette}
          onBack={openBack}
          onSettings={openSettings}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.avatarFrame}>
          <LinearGradient
            colors={[colors.brand, colors.purple]}
            style={styles.avatarRing}
          >
            {avatarUrl.data ? (
              <Image
                source={{ uri: avatarUrl.data }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarFallback,
                  { backgroundColor: palette.infoContainer },
                ]}
              >
                <Text style={[styles.avatarLetter, { color: colors.brand }]}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </LinearGradient>
          <Pressable
            accessibilityLabel="Chỉnh sửa ảnh đại diện"
            accessibilityRole="button"
            onPress={() => router.push('/(details)/profile/edit')}
            style={styles.avatarEdit}
          >
            <SymbolView name="pencil" size={18} tintColor="#FFFFFF" />
          </Pressable>
        </View>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: palette.text }]}
        >
          {displayName}
        </Text>
        <Text style={[styles.bio, { color: palette.muted }]}>
          {profile.data.bio ||
            `${roleLabel}. Hãy cập nhật phần giới thiệu của bạn.`}
        </Text>
        <View style={styles.stats}>
          <StatCard
            value={String(portfolio.data?.length ?? 0)}
            label="Portfolio"
            palette={palette}
          />
          <StatCard
            value={profileCompletion}
            label="Hồ sơ"
            palette={palette}
            compact
          />
        </View>
      </View>

      <View style={styles.roleSwitcher}>
        <RoleSwitcher
          roles={user.roles}
          userId={user.id}
          currentRoleId={roleId}
        />
      </View>

      <ProfileSection title="Tài khoản" palette={palette}>
        <MenuRow
          icon="person.crop.circle"
          iconColor={colors.brand}
          iconBackground={palette.infoContainer}
          label="Chỉnh sửa hồ sơ"
          palette={palette}
          onPress={() => router.push('/(details)/profile/edit')}
        />
        <MenuRow
          icon="checkmark.shield"
          iconColor={colors.brand}
          iconBackground={palette.infoContainer}
          label="An toàn và quyền riêng tư"
          palette={palette}
          onPress={() => router.push('/(details)/trust' as never)}
        />
        <MenuRow
          icon="calendar"
          iconColor={colors.brand}
          iconBackground={palette.infoContainer}
          label="Lịch chụp"
          palette={palette}
          onPress={() => router.push('/(details)/bookings' as never)}
          last={role !== 'PHOTOGRAPHER'}
        />
        {role === 'PHOTOGRAPHER' ? (
          <MenuRow
            icon="photo.on.rectangle"
            iconColor={colors.brand}
            iconBackground={palette.infoContainer}
            label="Quản lý portfolio"
            palette={palette}
            onPress={() => router.push('/(details)/profile/portfolio')}
            last
          />
        ) : null}
      </ProfileSection>

      <ProfileSection title="Tùy chọn" palette={palette}>
        <MenuRow
          icon="bell"
          iconColor={colors.purple}
          iconBackground="rgba(124, 58, 237, 0.12)"
          label="Thông báo"
          palette={palette}
          onPress={openSettings}
        />
        <MenuRow
          icon="globe"
          iconColor={colors.purple}
          iconBackground="rgba(124, 58, 237, 0.12)"
          label="Ngôn ngữ"
          subtitle="Tiếng Việt"
          palette={palette}
          onPress={openSettings}
          last
        />
      </ProfileSection>

      <ProfileSection title="Trợ giúp" palette={palette}>
        <MenuRow
          icon="questionmark.circle"
          iconColor={colors.discovery.interest}
          iconBackground="rgba(32, 201, 151, 0.14)"
          label="Hỗ trợ và an toàn"
          palette={palette}
          onPress={() => router.push('/(details)/trust' as never)}
        />
        <MenuRow
          icon="info.circle"
          iconColor={colors.discovery.interest}
          iconBackground="rgba(32, 201, 151, 0.14)"
          label="Giới thiệu PhotoMatch"
          palette={palette}
          onPress={() => void Linking.openURL('https://photomatch.vn')}
          last
        />
      </ProfileSection>

      <View
        style={[
          styles.readinessCard,
          {
            backgroundColor: progress.data.discoveryEligible
              ? palette.successContainer
              : palette.warningContainer,
          },
        ]}
      >
        <View style={styles.readinessHeading}>
          <SymbolView
            name={
              progress.data.discoveryEligible
                ? 'checkmark.seal.fill'
                : 'exclamationmark.triangle.fill'
            }
            size={22}
            tintColor={
              progress.data.discoveryEligible
                ? palette.success
                : palette.warning
            }
          />
          <View style={styles.flex}>
            <Text style={[styles.readinessTitle, { color: palette.text }]}>
              {progress.data.discoveryEligible
                ? 'Hồ sơ đã sẵn sàng khám phá'
                : 'Hoàn thiện hồ sơ để được khám phá'}
            </Text>
            <Text style={[styles.readinessText, { color: palette.muted }]}>
              {settings.data?.profileVisibilityEnabled
                ? 'Đang hiển thị hồ sơ'
                : 'Hồ sơ đang ẩn'}
            </Text>
          </View>
        </View>
        {progress.data.missing.map((item) => (
          <Text
            key={item}
            style={[styles.readinessText, { color: palette.muted }]}
          >
            • {missingLabels[item] ?? item}
          </Text>
        ))}
        {progress.data.discoveryReasons.map((item) => (
          <Text
            key={item}
            style={[styles.readinessText, { color: palette.muted }]}
          >
            • {discoveryReasonLabels[item] ?? item}
          </Text>
        ))}
        {warning ? (
          <Text style={[styles.warning, { color: palette.warning }]}>
            {warning}
          </Text>
        ) : null}
        {role === 'PHOTOGRAPHER' && photographer.data?.availabilityStatus ? (
          <Text style={[styles.readinessText, { color: palette.muted }]}>
            Nhận lịch: {photographer.data.availabilityStatus}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đăng xuất"
        onPress={() => void session.signOut()}
        style={({ pressed }) => [
          styles.logout,
          {
            backgroundColor: palette.errorContainer,
            borderColor: palette.error,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.logoutInner}>
          <SymbolView
            name="rectangle.portrait.and.arrow.right"
            size={20}
            tintColor={palette.onErrorContainer}
          />
          <Text
            style={[styles.logoutText, { color: palette.onErrorContainer }]}
          >
            Đăng xuất
          </Text>
        </View>
      </Pressable>
    </AppScreen>
  );
}

function ProfileHeader({
  palette,
  onBack,
  onSettings,
}: {
  palette: Palette;
  onBack: () => void;
  onSettings: () => void;
}) {
  return (
    <View style={[styles.header, { borderBottomColor: palette.border }]}>
      <HeaderIcon
        icon="arrow.left"
        label="Quay lại"
        tintColor={colors.brand}
        onPress={onBack}
      />
      <Text style={[styles.headerTitle, { color: colors.brand }]}>Hồ sơ</Text>
      <HeaderIcon
        icon="gearshape"
        label="Mở cài đặt"
        tintColor={colors.brand}
        onPress={onSettings}
      />
    </View>
  );
}

function HeaderIcon({
  icon,
  label,
  tintColor,
  onPress,
}: {
  icon: IconName;
  label: string;
  tintColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={styles.headerButton}
    >
      <SymbolView name={icon} size={23} tintColor={tintColor} />
    </Pressable>
  );
}

function StatCard({
  value,
  label,
  palette,
  compact = false,
}: {
  value: string;
  label: string;
  palette: Palette;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: palette.surfaceVariant,
          borderColor: palette.border,
        },
      ]}
    >
      <Text
        style={[
          styles.statValue,
          { color: colors.brand },
          compact && styles.statValueCompact,
        ]}
      >
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

function ProfileSection({
  title,
  palette,
  children,
}: {
  title: string;
  palette: Palette;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.muted }]}>
        {title.toUpperCase()}
      </Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.surfaceVariant,
            borderColor: palette.border,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  iconColor,
  iconBackground,
  label,
  subtitle,
  palette,
  onPress,
  last = false,
}: {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  label: string;
  subtitle?: string;
  palette: Palette;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !last && {
          borderBottomColor: palette.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.menuRowInner}>
        <View style={[styles.menuIcon, { backgroundColor: iconBackground }]}>
          <SymbolView name={icon} size={21} tintColor={iconColor} />
        </View>
        <View style={styles.menuCopy}>
          <Text style={[styles.menuLabel, { color: palette.text }]}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={[styles.menuSubtitle, { color: palette.muted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <SymbolView name="chevron.right" size={19} tintColor={palette.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: typography.semibold, fontSize: 20 },
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  avatarFrame: { position: 'relative', marginBottom: spacing.sm },
  avatarRing: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    borderRadius: 66,
    ...elevation.card,
  },
  avatar: {
    width: 124,
    height: 124,
    borderWidth: 4,
    borderColor: colors.light.surface,
    borderRadius: 62,
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: typography.bold, fontSize: 44 },
  avatarEdit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.light.surface,
    borderRadius: 19,
    backgroundColor: colors.brand,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 28,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  bio: {
    maxWidth: 320,
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  stats: {
    width: '62%',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  statCard: {
    flex: 1,
    minHeight: 82,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  statValue: { fontFamily: typography.semibold, fontSize: 24 },
  statValueCompact: { fontSize: 15, textAlign: 'center' },
  statLabel: { fontFamily: typography.regular, fontSize: 13 },
  roleSwitcher: { width: '100%' },
  section: { gap: spacing.md },
  sectionTitle: {
    marginLeft: spacing.xs,
    fontFamily: typography.semibold,
    fontSize: 14,
    letterSpacing: 1.8,
  },
  sectionCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  menuRow: {
    minHeight: 70,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuRowInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  menuCopy: { flex: 1 },
  menuLabel: { fontFamily: typography.regular, fontSize: 16 },
  menuSubtitle: { marginTop: 2, fontFamily: typography.regular, fontSize: 12 },
  themeToggle: { flexDirection: 'row', padding: 3, borderRadius: radius.full },
  themeOption: {
    width: 34,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  readinessCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  readinessHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  readinessTitle: { fontFamily: typography.semibold, fontSize: 14 },
  readinessText: {
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  warning: { fontFamily: typography.semibold, fontSize: 12 },
  flex: { flex: 1 },
  logout: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  logoutInner: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutText: { fontFamily: typography.semibold, fontSize: 16 },
  pressed: { opacity: 0.76 },
});

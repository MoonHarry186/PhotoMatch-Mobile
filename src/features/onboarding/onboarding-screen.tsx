import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { useNavigationStore } from '@/stores/navigation.store';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { onboardingApi } from './onboarding.api';
import {
  firstIncompleteStep,
  nextOnboardingStep,
  onboardingSteps,
  previousOnboardingStep,
  type OnboardingStep,
} from './onboarding.model';
import {
  AvatarSection,
  PersonalProfileSection,
  ProviderChoiceSection,
} from './onboarding-sections';

const stepLabels: Record<OnboardingStep, string> = {
  personal: 'Cá nhân',
  avatar: 'Ảnh',
  provider: 'Cung cấp dịch vụ',
};

export function OnboardingScreen() {
  const session = useSession();
  const router = useRouter();
  const user = session.snapshot?.user;
  const scope = useMemo(
    () => ({
      userId: user?.id ?? 'unknown',
      roleId: user?.currentRoleId ?? null,
    }),
    [user?.currentRoleId, user?.id],
  );
  const progress = useQuery({
    queryKey: queryKeys.onboarding(scope),
    queryFn: onboardingApi.progress,
    initialData: session.snapshot?.onboarding,
  });
  const profile = useQuery({
    queryKey: queryKeys.selfProfile(scope),
    queryFn: onboardingApi.self,
    enabled: Boolean(user),
  });
  const [stepOverride, setStepOverride] = useState<OnboardingStep | null>(null);
  const currentStep =
    stepOverride ??
    firstIncompleteStep(
      progress.data ?? {
        complete: false,
        missing: ['displayName'],
      },
    );
  const currentStepIndex = onboardingSteps.indexOf(currentStep);

  if (session.gate === 'signed-out') return <Redirect href="/(auth)/sign-in" />;
  if (session.gate === 'app') return <Redirect href="/(tabs)/discovery" />;
  if (!user || progress.isPending || profile.isPending)
    return <LoadingState label="Đang tải tiến độ onboarding…" />;
  if (progress.isError || profile.isError || !progress.data) {
    return (
      <ErrorState
        title="Không thể tải onboarding"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => {
          void progress.refetch();
          void profile.refetch();
        }}
      />
    );
  }

  const refreshAndAdvance = async (from: OnboardingStep) => {
    const [next] = await Promise.all([progress.refetch(), profile.refetch()]);
    if (!next.data) return;
    const nextStep = nextOnboardingStep(from);
    setStepOverride(nextStep ?? firstIncompleteStep(next.data));
  };
  const complete = async (role: 'CUSTOMER' | 'PHOTOGRAPHER') => {
    await session.reload({ refreshAccessToken: true });
    if (role === 'PHOTOGRAPHER')
      useNavigationStore.getState().showProviderSetupBanner();
    else useNavigationStore.getState().dismissProviderSetupBanner();
    router.replace('/(tabs)/discovery');
  };
  const goBack = () => {
    const previous = previousOnboardingStep(currentStep);
    if (previous) setStepOverride(previous);
  };

  let content;
  switch (currentStep) {
    case 'provider':
      content = <ProviderChoiceSection user={user} onSelected={complete} />;
      break;
    case 'personal':
      content = (
        <PersonalProfileSection
          profile={profile.data}
          scope={scope}
          onSaved={() => refreshAndAdvance('personal')}
        />
      );
      break;
    case 'avatar':
      content = (
        <AvatarSection
          profile={profile.data}
          scope={scope}
          onSaved={() => refreshAndAdvance('avatar')}
          showContinue
        />
      );
      break;
  }

  return (
    <AppScreen>
      <View style={styles.topbar}>
        {currentStepIndex > 0 ? (
          <Button label="← Quay lại" variant="ghost" onPress={goBack} />
        ) : (
          <View />
        )}
        <Text style={styles.stepCount}>
          {currentStepIndex + 1}/{onboardingSteps.length}
        </Text>
      </View>
      <View style={styles.progress}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>Thiết lập tài khoản</Text>
          <Text style={styles.progressCurrent}>{stepLabels[currentStep]}</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.max(
                  10,
                  ((currentStepIndex + 1) / onboardingSteps.length) * 100,
                )}%`,
              },
            ]}
          />
        </View>
      </View>
      <View style={styles.contentCard}>
        {content ?? (
          <>
            <Text style={styles.error}>
              Chưa xác định được vai trò hiện tại.
            </Text>
            <Button
              label="Tải lại"
              onPress={() => void session.reload({ refreshAccessToken: true })}
            />
          </>
        )}
      </View>
      <Button
        label="Đăng xuất"
        variant="ghost"
        onPress={() => void session.signOut()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepCount: {
    minWidth: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
    color: colors.brand,
    fontFamily: typography.bold,
    textAlign: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.light.infoContainer,
  },
  progress: { gap: spacing.sm },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressLabel: {
    color: colors.light.text,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  progressCurrent: {
    color: colors.light.muted,
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  track: {
    height: 6,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: colors.light.border,
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.brand,
  },
  contentCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.xl,
    backgroundColor: colors.light.surface,
    ...elevation.card,
  },
  error: { color: colors.danger },
});

import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { useTheme } from '@/providers/theme-provider';
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
  personal: 'onboarding.personalStep',
  avatar: 'onboarding.avatarStep',
  provider: 'onboarding.providerStep',
};

export function OnboardingScreen() {
  const session = useSession();
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
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
    return <LoadingState label={t('onboarding.loading')} />;
  if (progress.isError || profile.isError || !progress.data) {
    return (
      <ErrorState
        title={t('onboarding.loadError')}
        primaryActionLabel={t('common.retry')}
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
          <Button
            label={t('onboarding.back')}
            variant="ghost"
            onPress={goBack}
          />
        ) : (
          <View />
        )}
        <Text
          style={[
            styles.stepCount,
            { backgroundColor: palette.infoContainer, color: palette.info },
          ]}
        >
          {currentStepIndex + 1}/{onboardingSteps.length}
        </Text>
      </View>
      <View style={styles.progress}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: palette.text }]}>
            {t('onboarding.setupAccount')}
          </Text>
          <Text style={[styles.progressCurrent, { color: palette.muted }]}>
            {t(
              stepLabels[currentStep] as
                | 'onboarding.personalStep'
                | 'onboarding.avatarStep'
                | 'onboarding.providerStep',
            )}
          </Text>
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
            <Text style={[styles.error, { color: palette.error }]}>
              {t('role.current')}
            </Text>
            <Button
              label={t('onboarding.reload')}
              onPress={() => void session.reload({ refreshAccessToken: true })}
            />
          </>
        )}
      </View>
      <Button
        label={t('onboarding.signOut')}
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
    fontFamily: typography.bold,
    textAlign: 'center',
    borderRadius: radius.full,
  },
  progress: { gap: spacing.sm },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  progressLabel: {
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  progressCurrent: {
    fontFamily: typography.semibold,
    fontSize: 13,
  },
  track: {
    height: 6,
    overflow: 'hidden',
    borderRadius: radius.full,
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
    borderRadius: radius.xl,
    ...elevation.card,
  },
  error: { color: colors.danger },
});

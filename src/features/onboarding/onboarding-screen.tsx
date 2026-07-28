import { useQuery } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';

import { onboardingApi } from './onboarding.api';
import {
  firstIncompleteStep,
  nextIncompleteStep,
  type OnboardingStep,
} from './onboarding.model';
import {
  ActivityFieldsSection,
  AvatarSection,
  LocationSection,
  OnboardingSummary,
  PersonalProfileSection,
  PortfolioRequirement,
  RoleSection,
  ServicesSection,
} from './onboarding-sections';

const stepLabels: Record<OnboardingStep, string> = {
  role: 'Vai trò',
  personal: 'Cá nhân',
  avatar: 'Ảnh',
  location: 'Vị trí',
  fields: 'Lĩnh vực',
  services: 'Dịch vụ',
  portfolio: 'Portfolio',
  summary: 'Tổng kết',
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
  const roleId = progress.data?.userRoleId ?? user?.currentRoleId ?? null;
  const portfolio = useQuery({
    queryKey: queryKeys.portfolio({ ...scope, roleId }),
    queryFn: () => onboardingApi.portfolio(roleId ?? ''),
    enabled: Boolean(roleId && progress.data?.role === 'PHOTOGRAPHER'),
  });
  const [stepOverride, setStepOverride] = useState<OnboardingStep | null>(null);
  const currentStep = progress.data?.complete
    ? 'summary'
    : (stepOverride ??
      firstIncompleteStep(
        progress.data ?? {
          complete: false,
          missing: ['role'],
        },
      ));

  if (session.gate === 'signed-out') return <Redirect href="/(auth)/sign-in" />;
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

  const resolvedScope = roleId ? { userId: user.id, roleId } : null;
  const refreshAndAdvance = async (from: OnboardingStep) => {
    const [next] = await Promise.all([progress.refetch(), profile.refetch()]);
    if (!next.data) return;
    setStepOverride(nextIncompleteStep(next.data, from));
  };
  const skip = (from: OnboardingStep) =>
    setStepOverride(nextIncompleteStep(progress.data, from));
  const complete = async () => {
    await session.reload();
    router.replace('/(tabs)/discovery');
  };

  let content;
  switch (currentStep) {
    case 'role':
      content = (
        <RoleSection
          user={user}
          onSelected={async () => {
            await session.reload({ refreshAccessToken: true });
            const next = await progress.refetch();
            if (next.data) setStepOverride(firstIncompleteStep(next.data));
          }}
        />
      );
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
          onSkip={() => skip('avatar')}
        />
      );
      break;
    case 'location':
      content = resolvedScope ? (
        <LocationSection
          scope={resolvedScope}
          onSaved={() => refreshAndAdvance('location')}
          onSkip={() => skip('location')}
        />
      ) : null;
      break;
    case 'fields':
      content = resolvedScope ? (
        <ActivityFieldsSection
          scope={resolvedScope}
          role={progress.data.role}
          onSaved={() => refreshAndAdvance('fields')}
        />
      ) : null;
      break;
    case 'services':
      content = resolvedScope ? (
        <ServicesSection
          scope={resolvedScope}
          role={progress.data.role}
          onSaved={() => refreshAndAdvance('services')}
        />
      ) : null;
      break;
    case 'portfolio':
      content = (
        <PortfolioRequirement
          role={progress.data.role}
          count={portfolio.data?.length ?? 0}
          onSummary={() => setStepOverride('summary')}
        />
      );
      break;
    case 'summary':
      content = resolvedScope ? (
        <OnboardingSummary
          progress={progress.data}
          portfolioCount={portfolio.data?.length ?? 0}
          scope={resolvedScope}
          onResume={() => setStepOverride(firstIncompleteStep(progress.data))}
          onComplete={complete}
        />
      ) : null;
      break;
  }

  return (
    <AppScreen>
      <View style={styles.progress}>
        <Text style={styles.progressLabel}>
          Bước hiện tại: {stepLabels[currentStep]}
        </Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.max(
                  10,
                  ((Object.keys(stepLabels).indexOf(currentStep) + 1) / 8) *
                    100,
                )}%`,
              },
            ]}
          />
        </View>
      </View>
      {content ?? (
        <>
          <Text style={styles.error}>Chưa xác định được vai trò hiện tại.</Text>
          <Button
            label="Tải lại"
            onPress={() => void session.reload({ refreshAccessToken: true })}
          />
        </>
      )}
      <Button
        label="Đăng xuất"
        variant="ghost"
        onPress={() => void session.signOut()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: spacing.sm },
  progressLabel: {
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
  error: { color: colors.danger },
});

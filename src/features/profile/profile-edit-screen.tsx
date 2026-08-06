import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, Select, TextField } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import {
  ActivityFieldsSection,
  AvatarSection,
  LocationSection,
  PersonalProfileSection,
  PresenceControl,
  ServicesSection,
} from '@/features/onboarding/onboarding-sections';
import { useSession } from '@/providers/session-provider';
import { useTheme } from '@/providers/theme-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';

export function ProfileEditScreen() {
  const session = useSession();
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const [headlineOverride, setHeadline] = useState<string | null>(null);
  const [yearsExperienceOverride, setYearsExperience] = useState<string | null>(
    null,
  );
  const [availabilityOverride, setAvailability] = useState<
    'AVAILABLE' | 'BUSY' | 'UNAVAILABLE' | null
  >(null);
  const headline = headlineOverride ?? photographer.data?.headline ?? '';
  const yearsExperience =
    yearsExperienceOverride ??
    photographer.data?.yearsExperience?.toString() ??
    '';
  const availability =
    availabilityOverride ??
    photographer.data?.availabilityStatus ??
    'AVAILABLE';
  const [photographerError, setPhotographerError] = useState<string | null>(
    null,
  );
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const photographerMutation = useMutation({
    mutationFn: onboardingApi.updatePhotographer,
    onSuccess: (data) =>
      queryClient.setQueryData(queryKeys.photographerProfile(scope), data),
  });
  const visibilityMutation = useMutation({
    mutationFn: onboardingApi.updateVisibility,
    onSuccess: async (data) => {
      setVisibilityError(null);
      queryClient.setQueryData(queryKeys.settings(scope), data);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding(scope),
      });
    },
    onError: (caught) =>
      setVisibilityError(getUserErrorMessage(normalizeError(caught))),
  });

  if (session.gate === 'signed-out') return <Redirect href="/(auth)/sign-in" />;
  if (!user || !roleId || profile.isPending || progress.isPending)
    return <LoadingState label={t('profile.loading')} />;
  if (profile.isError || progress.isError || !progress.data) {
    return (
      <ErrorState
        title={t('profile.loadError')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => {
          void profile.refetch();
          void progress.refetch();
        }}
      />
    );
  }
  const resolvedScope = { userId: user.id, roleId };
  const refresh = async () => {
    await Promise.all([profile.refetch(), progress.refetch()]);
  };
  const savePhotographer = async () => {
    const years = yearsExperience ? Number(yearsExperience) : undefined;
    if (
      years !== undefined &&
      (!Number.isInteger(years) || years < 0 || years > 80)
    ) {
      setPhotographerError(t('profile.experienceRange'));
      return;
    }
    try {
      setPhotographerError(null);
      await photographerMutation.mutateAsync({
        headline: headline.trim(),
        ...(years !== undefined ? { yearsExperience: years } : {}),
        availabilityStatus: availability,
      });
      await progress.refetch();
    } catch (caught) {
      setPhotographerError(getUserErrorMessage(normalizeError(caught)));
    }
  };

  return (
    <AppScreen>
      <View style={styles.topbar}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: palette.text }]}
        >
          {t('profile.editTitle')}
        </Text>
        <Button
          label={t('profile.close')}
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>
      <View style={[styles.section, { backgroundColor: palette.surface }]}>
        <PersonalProfileSection
          profile={profile.data}
          scope={resolvedScope}
          onSaved={refresh}
        />
      </View>
      <View style={[styles.section, { backgroundColor: palette.surface }]}>
        <AvatarSection
          profile={profile.data}
          scope={resolvedScope}
          onSaved={refresh}
        />
      </View>
      {role === 'PHOTOGRAPHER' ? (
        <>
          <View style={[styles.section, { backgroundColor: palette.surface }]}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {t('profile.photographerInfo')}
            </Text>
            <TextField
              label={t('profile.headline')}
              value={headline}
              onChangeText={setHeadline}
            />
            <TextField
              label={t('profile.yearsExperience')}
              keyboardType="number-pad"
              value={yearsExperience}
              onChangeText={setYearsExperience}
            />
            <Select
              label={t('profile.availability')}
              value={availability}
              options={[
                { value: 'AVAILABLE', label: t('profile.available') },
                { value: 'BUSY', label: t('profile.busy') },
                { value: 'UNAVAILABLE', label: t('profile.unavailable') },
              ]}
              onChange={(value) =>
                setAvailability(value as typeof availability)
              }
            />
            {photographerError ? (
              <Text style={styles.error}>{photographerError}</Text>
            ) : null}
            <Button
              label={t('profile.savePhotographer')}
              loading={photographerMutation.isPending}
              onPress={() => void savePhotographer()}
            />
          </View>
          <View style={[styles.section, { backgroundColor: palette.surface }]}>
            <ActivityFieldsSection
              scope={resolvedScope}
              role="PHOTOGRAPHER"
              onSaved={refresh}
            />
          </View>
          <View style={[styles.section, { backgroundColor: palette.surface }]}>
            <ServicesSection
              scope={resolvedScope}
              role="PHOTOGRAPHER"
              onSaved={refresh}
            />
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>
              {t('profile.portfolio')}
            </Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              {t('profile.portfolioRequirement')}
            </Text>
            <Button
              label={t('profile.managePortfolio')}
              variant="secondary"
              onPress={() => router.push('/(details)/profile/portfolio')}
            />
          </View>
        </>
      ) : null}
      <View style={[styles.section, { backgroundColor: palette.surface }]}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          {t('profile.privacyLocation')}
        </Text>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              {t('profile.profileVisibility')}
            </Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              {t('profile.profileVisibilityDescription')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('profile.profileVisibility')}
            trackColor={{ false: palette.border, true: palette.success }}
            thumbColor={palette.surface}
            disabled={visibilityMutation.isPending}
            value={settings.data?.profileVisibilityEnabled ?? false}
            onValueChange={(value) => visibilityMutation.mutate(value)}
          />
        </View>
        {visibilityError ? (
          <Text style={styles.error}>{visibilityError}</Text>
        ) : null}
        <LocationSection scope={resolvedScope} onSaved={refresh} />
        <PresenceControl scope={resolvedScope} progress={progress.data} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 28,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 20,
  },
  section: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  switchRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: { flex: 1 },
  cardTitle: { fontFamily: typography.semibold },
  muted: {},
  error: { color: colors.danger },
});

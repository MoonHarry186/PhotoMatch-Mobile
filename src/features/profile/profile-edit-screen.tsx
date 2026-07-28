import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, Select, TextField } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import {
  AvatarSection,
  LocationSection,
  PersonalProfileSection,
  PresenceControl,
} from '@/features/onboarding/onboarding-sections';
import { useSession } from '@/providers/session-provider';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';

export function ProfileEditScreen() {
  const session = useSession();
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
    return <LoadingState label="Đang tải hồ sơ chỉnh sửa…" />;
  if (profile.isError || progress.isError || !progress.data) {
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
      setPhotographerError('Số năm kinh nghiệm cần từ 0 đến 80');
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
        <Text accessibilityRole="header" style={styles.title}>
          Chỉnh sửa hồ sơ
        </Text>
        <Button label="Đóng" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.section}>
        <PersonalProfileSection
          profile={profile.data}
          scope={resolvedScope}
          onSaved={refresh}
        />
      </View>
      <View style={styles.section}>
        <AvatarSection
          profile={profile.data}
          scope={resolvedScope}
          onSaved={refresh}
        />
      </View>
      {role === 'PHOTOGRAPHER' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin Photographer</Text>
          <TextField
            label="Tiêu đề chuyên môn"
            value={headline}
            onChangeText={setHeadline}
          />
          <TextField
            label="Số năm kinh nghiệm"
            keyboardType="number-pad"
            value={yearsExperience}
            onChangeText={setYearsExperience}
          />
          <Select
            label="Tình trạng nhận lịch"
            value={availability}
            options={[
              { value: 'AVAILABLE', label: 'Sẵn sàng' },
              { value: 'BUSY', label: 'Đang bận' },
              { value: 'UNAVAILABLE', label: 'Không nhận lịch' },
            ]}
            onChange={(value) => setAvailability(value as typeof availability)}
          />
          {photographerError ? (
            <Text style={styles.error}>{photographerError}</Text>
          ) : null}
          <Button
            label="Lưu thông tin Photographer"
            loading={photographerMutation.isPending}
            onPress={() => void savePhotographer()}
          />
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quyền riêng tư và vị trí</Text>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>Hiển thị hồ sơ</Text>
            <Text style={styles.muted}>
              Tắt mục này sẽ làm hồ sơ không đủ điều kiện Khám phá.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Hiển thị hồ sơ"
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
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 28,
  },
  sectionTitle: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  section: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
  },
  switchRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  flex: { flex: 1 },
  cardTitle: { color: colors.light.text, fontFamily: typography.semibold },
  muted: { color: colors.light.muted },
  error: { color: colors.danger },
});

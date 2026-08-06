import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, Select } from '@/components/ui';
import { useI18n } from '@/i18n/i18n-provider';
import { useTheme } from '@/providers/theme-provider';
import { onboardingApi } from '@/features/onboarding/onboarding.api';
import { queryKeys } from '@/services/api/query-keys';
import { colors, spacing, typography } from '@/theme';

export function SettingsScreen({
  scope,
}: {
  scope: { userId: string; roleId: string };
}) {
  const router = useRouter();
  const theme = useTheme();
  const palette = theme.resolved === 'dark' ? colors.dark : colors.light;
  const { locale, setLocale, t } = useI18n();
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: queryKeys.settings(scope),
    queryFn: onboardingApi.settings,
  });
  const update = useMutation({
    mutationFn: onboardingApi.updateSettings,
    onSuccess: (value) => client.setQueryData(queryKeys.settings(scope), value),
  });
  if (settings.isPending) return <LoadingState label={t('settings.loading')} />;
  if (settings.isError || !settings.data)
    return (
      <ErrorState
        title={t('settings.loadError')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void settings.refetch()}
      />
    );
  const value = settings.data;
  return (
    <AppScreen>
      <Button
        label={t('settings.back')}
        variant="ghost"
        onPress={() => router.back()}
      />
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.text }]}
      >
        {t('settings.title')}
      </Text>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          {t('settings.appearance')}
        </Text>
        <Select
          label={t('settings.theme')}
          value={theme.preference.toUpperCase()}
          options={[
            { value: 'SYSTEM', label: t('settings.system') },
            { value: 'LIGHT', label: t('settings.light') },
            { value: 'DARK', label: t('settings.dark') },
          ]}
          onChange={(next) => {
            const selected = Array.isArray(next) ? next[0] : next;
            const normalized = (selected ?? 'SYSTEM').toLowerCase() as
              'system' | 'light' | 'dark';
            void theme.setPreference(normalized);
            update.mutate({
              theme: (selected ?? 'SYSTEM') as 'SYSTEM' | 'LIGHT' | 'DARK',
            });
          }}
        />
        <Select
          label={t('settings.language')}
          value={locale.toUpperCase()}
          options={[
            { value: 'VI', label: t('settings.vietnamese') },
            { value: 'EN', label: t('settings.english') },
          ]}
          onChange={(next) =>
            void setLocale(
              ((Array.isArray(next) ? next[0] : next) ?? 'VI').toLowerCase() as
                'vi' | 'en',
            )
          }
        />
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          {t('settings.notificationsPrivacy')}
        </Text>
        <SettingRow
          label={t('settings.matchNotifications')}
          value={value.matchNotificationsEnabled ?? true}
          onChange={(next) =>
            update.mutate({ matchNotificationsEnabled: next })
          }
        />
        <SettingRow
          label={t('settings.bookingNotifications')}
          value={value.bookingNotificationsEnabled ?? true}
          onChange={(next) =>
            update.mutate({ bookingNotificationsEnabled: next })
          }
        />
        <SettingRow
          label={t('settings.readReceipts')}
          value={value.readReceiptsEnabled ?? true}
          onChange={(next) => update.mutate({ readReceiptsEnabled: next })}
        />
        <SettingRow
          label={t('settings.profileVisibility')}
          value={value.profileVisibilityEnabled ?? false}
          onChange={(next) => update.mutate({ profileVisibilityEnabled: next })}
        />
        <Select
          label={t('settings.nearbyDuration')}
          value={String(value.locationVisibilityDurationHours ?? 24)}
          options={[
            { value: '1', label: t('settings.oneHour') },
            { value: '24', label: t('settings.oneDay') },
            { value: '72', label: t('settings.threeDays') },
          ]}
          onChange={(next) => {
            const selected = Array.isArray(next) ? next[0] : next;
            update.mutate({
              locationVisibilityDurationHours: Number(selected ?? 24),
            });
          }}
        />
        <Button
          label={t('settings.deleteLocation')}
          variant="secondary"
          onPress={() => void onboardingApi.deleteLocation()}
        />
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          {t('settings.legalInfo')}
        </Text>
        <Button
          label={t('legal.termsTitle')}
          variant="secondary"
          onPress={() => router.push('/(public)/legal/terms')}
        />
        <Button
          label={t('legal.privacyTitle')}
          variant="secondary"
          onPress={() => router.push('/(public)/legal/privacy')}
        />
        <Button
          label={t('settings.about')}
          variant="secondary"
          onPress={() => void Linking.openURL('https://photomatch.vn')}
        />
        <Button
          label={t('settings.invite')}
          onPress={() =>
            void Share.share({
              message: t('settings.shareMessage'),
            })
          }
        />
      </View>
    </AppScreen>
  );
}

function SettingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  const palette = theme.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.row}>
      <Text style={[styles.flex, { color: palette.text }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: palette.border, true: colors.brand }}
        thumbColor={palette.surface}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  title: {
    fontFamily: typography.bold,
    fontSize: 26,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  flex: { flex: 1 },
});

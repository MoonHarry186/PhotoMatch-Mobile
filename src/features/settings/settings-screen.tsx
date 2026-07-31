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
  const { locale, setLocale } = useI18n();
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: queryKeys.settings(scope),
    queryFn: onboardingApi.settings,
  });
  const update = useMutation({
    mutationFn: onboardingApi.updateSettings,
    onSuccess: (value) => client.setQueryData(queryKeys.settings(scope), value),
  });
  if (settings.isPending) return <LoadingState label="Đang tải cài đặt…" />;
  if (settings.isError || !settings.data)
    return (
      <ErrorState
        title="Không thể tải cài đặt"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void settings.refetch()}
      />
    );
  const value = settings.data;
  return (
    <AppScreen>
      <Button label="Quay lại" variant="ghost" onPress={() => router.back()} />
      <Text accessibilityRole="header" style={styles.title}>
        Cài đặt
      </Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giao diện</Text>
        <Select
          label="Chủ đề"
          value={theme.preference.toUpperCase()}
          options={[
            { value: 'SYSTEM', label: 'Theo hệ thống' },
            { value: 'LIGHT', label: 'Sáng' },
            { value: 'DARK', label: 'Tối' },
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
          label="Ngôn ngữ"
          value={locale.toUpperCase()}
          options={[
            { value: 'VI', label: 'Tiếng Việt' },
            { value: 'EN', label: 'English' },
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
        <Text style={styles.sectionTitle}>Thông báo và riêng tư</Text>
        <SettingRow
          label="Thông báo kết nối"
          value={value.matchNotificationsEnabled ?? true}
          onChange={(next) =>
            update.mutate({ matchNotificationsEnabled: next })
          }
        />
        <SettingRow
          label="Thông báo lịch chụp"
          value={value.bookingNotificationsEnabled ?? true}
          onChange={(next) =>
            update.mutate({ bookingNotificationsEnabled: next })
          }
        />
        <SettingRow
          label="Hiển thị trạng thái đã xem"
          value={value.readReceiptsEnabled ?? true}
          onChange={(next) => update.mutate({ readReceiptsEnabled: next })}
        />
        <SettingRow
          label="Hiển thị hồ sơ"
          value={value.profileVisibilityEnabled ?? false}
          onChange={(next) => update.mutate({ profileVisibilityEnabled: next })}
        />
        <Select
          label="Thời gian hiển thị Gần tôi"
          value={String(value.locationVisibilityDurationHours ?? 24)}
          options={[
            { value: '1', label: '1 giờ' },
            { value: '24', label: '24 giờ' },
            { value: '72', label: '3 ngày' },
          ]}
          onChange={(next) => {
            const selected = Array.isArray(next) ? next[0] : next;
            update.mutate({
              locationVisibilityDurationHours: Number(selected ?? 24),
            });
          }}
        />
        <Button
          label="Xóa vị trí đã lưu"
          variant="secondary"
          onPress={() => void onboardingApi.deleteLocation()}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pháp lý và thông tin</Text>
        <Button
          label="Điều khoản sử dụng"
          variant="secondary"
          onPress={() => router.push('/(public)/legal/terms')}
        />
        <Button
          label="Chính sách quyền riêng tư"
          variant="secondary"
          onPress={() => router.push('/(public)/legal/privacy')}
        />
        <Button
          label="Giới thiệu PhotoMatch"
          variant="secondary"
          onPress={() => void Linking.openURL('https://photomatch.vn')}
        />
        <Button
          label="Mời bạn bè"
          onPress={() =>
            void Share.share({
              message: 'Tham gia PhotoMatch để tìm photographer phù hợp.',
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
  return (
    <View style={styles.row}>
      <Text style={styles.flex}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 26,
  },
  section: { gap: spacing.md },
  sectionTitle: {
    color: colors.light.text,
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
  flex: { flex: 1, color: colors.light.text },
});

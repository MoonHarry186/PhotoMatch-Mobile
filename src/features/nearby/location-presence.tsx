import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StatusBadge } from '@/components/domain';
import { LoadingState } from '@/components/feedback';
import { Button, ConfirmDialog, Select } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import { queryKeys } from '@/services/api/query-keys';
import { colors, radius, spacing, typography } from '@/theme';

import {
  captureCurrentLocation,
  getLocationPermissionState,
  requestLocationPermission,
  type LocationPermissionState,
} from './location-permission';
import { nearbyApi } from './nearby.api';
import { presencePresentation } from './nearby.types';

type Scope = { userId: string; roleId: string };

const permissionCopy: Record<
  LocationPermissionState,
  { label: string; tone: 'neutral' | 'success' | 'warning'; message: string }
> = {
  undetermined: {
    label: 'Chưa hỏi quyền',
    tone: 'neutral',
    message:
      'PhotoMatch chỉ hỏi quyền khi bạn chủ động cập nhật vị trí hiện tại.',
  },
  granted: {
    label: 'Đã cấp quyền',
    tone: 'success',
    message: 'Bạn có thể cập nhật vị trí chính xác bất cứ lúc nào.',
  },
  denied: {
    label: 'Chưa cho phép',
    tone: 'warning',
    message:
      'Bạn đã từ chối quyền vị trí. Các tính năng khác vẫn sử dụng bình thường.',
  },
  restricted: {
    label: 'Quyền bị chặn',
    tone: 'warning',
    message: 'Hãy cho phép vị trí trong Cài đặt để cập nhật lại.',
  },
  'services-disabled': {
    label: 'Dịch vụ vị trí đang tắt',
    tone: 'warning',
    message:
      'Hãy bật dịch vụ vị trí của thiết bị. Nearby vẫn có thể dùng vị trí đã lưu trước đó.',
  },
};

function errorMessage(error: unknown) {
  return getUserErrorMessage(normalizeError(error));
}

export function LocationPermissionCard({ scope }: { scope: Scope }) {
  const queryClient = useQueryClient();
  const [permission, setPermission] =
    useState<LocationPermissionState>('undetermined');
  const [checking, setChecking] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [clearConfirmVisible, setClearConfirmVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void getLocationPermissionState()
      .then((value) => {
        if (active) setPermission(value);
      })
      .catch(() => {
        if (active) setPermission('denied');
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resetNearby = async () => {
    await queryClient.cancelQueries({
      queryKey: queryKeys.nearbyRoot(scope),
    });
    queryClient.removeQueries({ queryKey: queryKeys.nearbyRoot(scope) });
  };

  const update = useMutation({
    mutationFn: async () => {
      const next =
        permission === 'granted'
          ? permission
          : await requestLocationPermission();
      setPermission(next);
      if (next !== 'granted') {
        throw new Error(permissionCopy[next].message);
      }
      return nearbyApi.updateExactLocation(await captureCurrentLocation());
    },
    onSuccess: async () => {
      setFeedback('Đã cập nhật vị trí. Nearby đang tải lại từ đầu.');
      await resetNearby();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.presence(scope),
      });
    },
  });

  const clear = useMutation({
    mutationFn: nearbyApi.clearExactLocation,
    onSuccess: async () => {
      setClearConfirmVisible(false);
      setFeedback('Đã xóa vị trí chính xác và tắt discovery presence.');
      await resetNearby();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.presence(scope),
      });
    },
  });

  const copy = permissionCopy[permission];
  const settingsRequired =
    permission === 'restricted' || permission === 'services-disabled';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={styles.title}>Vị trí của bạn</Text>
          <Text style={styles.description}>
            Vị trí chính xác chỉ được gửi tới endpoint của bạn. Nearby chỉ hiển
            thị khoảng cách gần đúng do backend tính.
          </Text>
        </View>
        {checking ? (
          <ActivityIndicator
            accessibilityLabel="Đang kiểm tra quyền vị trí"
            color={colors.brand}
          />
        ) : (
          <StatusBadge label={copy.label} tone={copy.tone} />
        )}
      </View>
      {!checking ? (
        <Text style={styles.description}>{copy.message}</Text>
      ) : null}
      {feedback ? <Text style={styles.success}>{feedback}</Text> : null}
      {update.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage(update.error)}
        </Text>
      ) : null}
      {clear.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage(clear.error)}
        </Text>
      ) : null}
      <Button
        label={
          permission === 'granted'
            ? 'Cập nhật vị trí hiện tại'
            : 'Cho phép và cập nhật vị trí'
        }
        loading={update.isPending}
        disabled={checking || clear.isPending || settingsRequired}
        onPress={() => {
          setFeedback(null);
          update.mutate();
        }}
      />
      {settingsRequired ? (
        <Button
          label="Mở Cài đặt"
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      <Button
        label="Xóa vị trí đã lưu"
        variant="ghost"
        disabled={update.isPending}
        onPress={() => {
          setFeedback(null);
          setClearConfirmVisible(true);
        }}
      />
      <ConfirmDialog
        visible={clearConfirmVisible}
        title="Xóa vị trí đã lưu?"
        message="Nearby sẽ không dùng vị trí này nữa và discovery presence của bạn cũng sẽ được tắt."
        confirmLabel="Xóa vị trí"
        destructive
        loading={clear.isPending}
        onConfirm={() => clear.mutate()}
        onCancel={() => setClearConfirmVisible(false)}
      />
    </View>
  );
}

const visibilityOptions = [1, 6, 12, 24, 48, 72, 168].map((hours) => ({
  value: String(hours),
  label: hours === 168 ? '7 ngày' : `${hours} giờ`,
}));

export function PresenceCard({ scope }: { scope: Scope }) {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState('24');
  const [now, setNow] = useState(() => Date.now());
  const presence = useQuery({
    queryKey: queryKeys.presence(scope),
    queryFn: nearbyApi.presence,
    refetchInterval: 60_000,
  });
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      nearbyApi.updatePresence({
        userRoleId: scope.roleId,
        enabled,
        visibilityHours: Number(duration),
      }),
    onSuccess: (value) =>
      queryClient.setQueryData(queryKeys.presence(scope), value),
  });

  if (presence.isPending)
    return <LoadingState label="Đang tải discovery presence…" />;

  const presentation = presencePresentation(presence.data, now);
  const visibleUntil = presence.data?.visibleUntil
    ? new Date(presence.data.visibleUntil).toLocaleString('vi-VN')
    : null;
  const status =
    presentation === 'visible'
      ? {
          label: 'Đang hiển thị',
          tone: 'success' as const,
          message: `Hiển thị đến ${visibleUntil}.`,
        }
      : presentation === 'expired'
        ? {
            label: 'Đã hết hạn',
            tone: 'warning' as const,
            message: 'Thời hạn hiển thị đã kết thúc. Bạn có thể đăng lại.',
          }
        : {
            label: 'Đang tắt',
            tone: 'neutral' as const,
            message: 'Hồ sơ hiện không xuất hiện trong Nearby/discovery.',
          };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={styles.title}>Discovery presence</Text>
          <Text style={styles.description}>{status.message}</Text>
        </View>
        <StatusBadge label={status.label} tone={status.tone} />
      </View>
      <Select
        label="Thời gian hiển thị"
        value={duration}
        options={visibilityOptions}
        onChange={(value) => setDuration(String(value))}
      />
      {presence.isError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage(presence.error)}
        </Text>
      ) : null}
      {mutation.error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errorMessage(mutation.error)}
        </Text>
      ) : null}
      <Button
        label={presentation === 'visible' ? 'Làm mới thời hạn' : 'Bật hiển thị'}
        loading={mutation.isPending}
        onPress={() => mutation.mutate(true)}
      />
      {presentation === 'visible' ? (
        <Button
          label="Tắt hiển thị"
          variant="secondary"
          disabled={mutation.isPending}
          onPress={() => mutation.mutate(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: { flex: 1, gap: spacing.xs },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  description: {
    color: colors.light.muted,
    lineHeight: 20,
  },
  success: { color: colors.light.success, fontFamily: typography.semibold },
  error: { color: colors.danger },
});

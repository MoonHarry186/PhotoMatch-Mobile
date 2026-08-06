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
import { useI18n } from '@/i18n/i18n-provider';
import { queryKeys } from '@/services/api/query-keys';
import { useTheme } from '@/providers/theme-provider';
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
  {
    labelKey:
      | 'nearby.permissionUndetermined'
      | 'nearby.permissionGranted'
      | 'nearby.permissionDenied'
      | 'nearby.permissionRestricted'
      | 'nearby.permissionServicesDisabled';
    messageKey:
      | 'nearby.permissionUndeterminedMessage'
      | 'nearby.permissionGrantedMessage'
      | 'nearby.permissionDeniedMessage'
      | 'nearby.permissionRestrictedMessage'
      | 'nearby.permissionServicesDisabledMessage';
    tone: 'neutral' | 'success' | 'warning';
  }
> = {
  undetermined: {
    labelKey: 'nearby.permissionUndetermined',
    tone: 'neutral',
    messageKey: 'nearby.permissionUndeterminedMessage',
  },
  granted: {
    labelKey: 'nearby.permissionGranted',
    tone: 'success',
    messageKey: 'nearby.permissionGrantedMessage',
  },
  denied: {
    labelKey: 'nearby.permissionDenied',
    tone: 'warning',
    messageKey: 'nearby.permissionDeniedMessage',
  },
  restricted: {
    labelKey: 'nearby.permissionRestricted',
    tone: 'warning',
    messageKey: 'nearby.permissionRestrictedMessage',
  },
  'services-disabled': {
    labelKey: 'nearby.permissionServicesDisabled',
    tone: 'warning',
    messageKey: 'nearby.permissionServicesDisabledMessage',
  },
};

function errorMessage(error: unknown) {
  return getUserErrorMessage(normalizeError(error));
}

export function LocationPermissionCard({ scope }: { scope: Scope }) {
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
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
        throw new Error(t(permissionCopy[next].messageKey));
      }
      return nearbyApi.updateExactLocation(await captureCurrentLocation());
    },
    onSuccess: async () => {
      setFeedback(t('nearby.locationUpdated'));
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
      setFeedback(t('nearby.locationCleared'));
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
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: palette.text }]}>
            {t('nearby.permissionTitle')}
          </Text>
          <Text style={[styles.description, { color: palette.muted }]}>
            {t('nearby.permissionDescription')}
          </Text>
        </View>
        {checking ? (
          <ActivityIndicator
            accessibilityLabel={t('nearby.permissionChecking')}
            color={palette.info}
          />
        ) : (
          <StatusBadge label={t(copy.labelKey)} tone={copy.tone} />
        )}
      </View>
      {!checking ? (
        <Text style={[styles.description, { color: palette.muted }]}>
          {t(copy.messageKey)}
        </Text>
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
            ? t('nearby.updateLocation')
            : t('nearby.allowAndUpdate')
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
          label={t('nearby.openSettings')}
          variant="secondary"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
      <Button
        label={t('nearby.clearLocation')}
        variant="ghost"
        disabled={update.isPending}
        onPress={() => {
          setFeedback(null);
          setClearConfirmVisible(true);
        }}
      />
      <ConfirmDialog
        visible={clearConfirmVisible}
        title={t('nearby.clearLocationTitle')}
        message={t('nearby.clearLocationMessage')}
        confirmLabel={t('nearby.deleteLocation')}
        destructive
        loading={clear.isPending}
        onConfirm={() => clear.mutate()}
        onCancel={() => setClearConfirmVisible(false)}
      />
    </View>
  );
}

export function PresenceCard({ scope }: { scope: Scope }) {
  const { t, locale } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
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
    return <LoadingState label={t('nearby.presenceLoading')} />;

  const visibilityOptions = [1, 6, 12, 24, 48, 72, 168].map((hours) => ({
    value: String(hours),
    label:
      hours === 168 ? t('nearby.days') : t('nearby.hour', { count: hours }),
  }));

  const presentation = presencePresentation(presence.data, now);
  const visibleUntil = presence.data?.visibleUntil
    ? new Date(presence.data.visibleUntil).toLocaleString(
        locale === 'en' ? 'en-US' : 'vi-VN',
      )
    : null;
  const status =
    presentation === 'visible'
      ? {
          label: t('nearby.visible'),
          tone: 'success' as const,
          message: t('nearby.visibleUntil', { time: visibleUntil ?? '' }),
        }
      : presentation === 'expired'
        ? {
            label: t('nearby.expired'),
            tone: 'warning' as const,
            message: t('nearby.expiredMessage'),
          }
        : {
            label: t('nearby.disabled'),
            tone: 'neutral' as const,
            message: t('nearby.disabledMessage'),
          };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: palette.text }]}>
            {t('nearby.presenceTitle')}
          </Text>
          <Text style={[styles.description, { color: palette.muted }]}>
            {status.message}
          </Text>
        </View>
        <StatusBadge label={status.label} tone={status.tone} />
      </View>
      <Select
        label={t('nearby.visibilityDuration')}
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
        label={
          presentation === 'visible'
            ? t('nearby.refreshVisibility')
            : t('nearby.enableVisibility')
        }
        loading={mutation.isPending}
        onPress={() => mutation.mutate(true)}
      />
      {presentation === 'visible' ? (
        <Button
          label={t('nearby.disableVisibility')}
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
    borderRadius: radius.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: { flex: 1, gap: spacing.xs },
  title: {
    fontFamily: typography.bold,
    fontSize: 18,
  },
  description: {
    lineHeight: 20,
  },
  success: { fontFamily: typography.semibold },
  error: { color: colors.danger },
});

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '@/components/domain';
import {
  ActionFeedback,
  ErrorState,
  LoadingState,
} from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, ConfirmDialog, TextField } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { createSubmissionKey } from '@/services/api/idempotency';
import { queryKeys } from '@/services/api/query-keys';
import { colors, elevation, radius, spacing, typography } from '@/theme';

import { discoveryApi } from './discovery.api';
import { relationshipErrorMessage } from './discovery.types';
import { matchStatusLabel } from './match-list';

export function MatchDetailScreen({
  matchId,
  scope,
}: {
  matchId: string;
  scope: { userId: string; roleId: string };
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [completed, setCompleted] = useState(false);
  const submission = useRef(createSubmissionKey());
  const match = useQuery({
    queryKey: queryKeys.match(scope, matchId),
    queryFn: ({ signal }) => discoveryApi.match(matchId, signal),
  });
  const unmatch = useMutation({
    mutationFn: () =>
      discoveryApi.unmatch(
        matchId,
        reason.trim(),
        submission.current.current(),
      ),
    onSuccess: async (value) => {
      submission.current.complete();
      setConfirmVisible(false);
      setCompleted(true);
      queryClient.setQueryData(queryKeys.match(scope, matchId), value);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.matches(scope),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations(scope),
        }),
      ]);
    },
  });

  if (match.isPending)
    return <LoadingState label={t('discovery.match.loading')} />;
  if (match.isError)
    return (
      <ErrorState
        title={t('discovery.match.error')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void match.refetch()}
        secondaryActionLabel={t('discovery.match.back')}
        onSecondaryAction={() => router.back()}
      />
    );

  const value = match.data;
  const name =
    value.counterpart.displayName || t('discovery.matches.defaultName');
  const error = unmatch.error ? normalizeError(unmatch.error) : null;
  return (
    <AppScreen>
      <View style={styles.header}>
        <Button
          label={t('discovery.match.back')}
          variant="ghost"
          onPress={() => router.back()}
        />
        <StatusBadge
          label={matchStatusLabel(value.status, locale)}
          tone={value.status === 'ACTIVE' ? 'success' : 'neutral'}
        />
      </View>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(value.counterpart.displayName ?? 'P').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {name}
        </Text>
        <Text style={styles.meta}>
          {t('discovery.match.matchedAt', {
            date: new Date(value.matchedAt).toLocaleString(
              locale === 'vi' ? 'vi-VN' : 'en-US',
            ),
          })}
        </Text>
        {value.endedAt ? (
          <Text style={styles.meta}>
            {t('discovery.match.endedAt', {
              date: new Date(value.endedAt).toLocaleString(
                locale === 'vi' ? 'vi-VN' : 'en-US',
              ),
            })}
          </Text>
        ) : null}
        {value.endReason ? (
          <Text style={styles.meta}>
            {t('discovery.match.reason', { reason: value.endReason })}
          </Text>
        ) : null}
        <Button
          label={t('discovery.match.profile')}
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/(details)/profile/[id]',
              params: { id: value.counterpart.userRoleId },
            })
          }
        />
        {value.conversation ? (
          <Button
            label={
              value.status === 'ACTIVE'
                ? t('discovery.match.openConversation')
                : t('discovery.match.viewConversation')
            }
            onPress={() =>
              router.push({
                pathname: '/(details)/conversation/[id]',
                params: { id: value.conversation!.id },
              })
            }
          />
        ) : null}
      </View>

      {completed ? (
        <ActionFeedback
          title={t('discovery.match.completedTitle')}
          message={t('discovery.match.completedMessage')}
        />
      ) : null}
      {value.status === 'ACTIVE' ? (
        <View style={styles.dangerZone}>
          <Text style={styles.sectionTitle}>
            {t('discovery.match.endTitle')}
          </Text>
          <Text style={styles.meta}>{t('discovery.match.endMessage')}</Text>
          <TextField
            label={t('discovery.match.reasonLabel')}
            value={reason}
            maxLength={500}
            multiline
            onChangeText={setReason}
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {relationshipErrorMessage(error, locale) ??
                getUserErrorMessage(error, locale)}
            </Text>
          ) : null}
          <Button
            label={t('discovery.match.end')}
            variant="danger"
            disabled={!reason.trim()}
            onPress={() => setConfirmVisible(true)}
          />
        </View>
      ) : (
        <Text style={styles.closed}>{t('discovery.match.closedMessage')}</Text>
      )}

      <ConfirmDialog
        visible={confirmVisible}
        title={t('discovery.match.confirmTitle', {
          name:
            value.counterpart.displayName || t('discovery.match.defaultName'),
        })}
        message={t('discovery.match.confirmMessage')}
        confirmLabel={t('discovery.match.end')}
        destructive
        loading={unmatch.isPending}
        onConfirm={() => unmatch.mutate()}
        onCancel={() => setConfirmVisible(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  card: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.light.surface,
    ...elevation.card,
  },
  avatar: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
    backgroundColor: colors.light.infoContainer,
  },
  avatarText: {
    color: colors.brand,
    fontFamily: typography.bold,
    fontSize: 34,
  },
  title: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 24,
    textAlign: 'center',
  },
  meta: { color: colors.light.muted, lineHeight: 21 },
  dangerZone: {
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.error,
    borderRadius: radius.lg,
    backgroundColor: colors.light.errorContainer,
  },
  sectionTitle: {
    color: colors.light.onErrorContainer,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  error: { color: colors.danger },
  closed: {
    color: colors.light.muted,
    lineHeight: 21,
    textAlign: 'center',
  },
});

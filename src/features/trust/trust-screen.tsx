import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, ConfirmDialog, Select, TextField } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { createSubmissionKey } from '@/services/api/idempotency';
import { queryKeys } from '@/services/api/query-keys';
import { uploadMedia } from '@/services/media/upload';
import { useTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

import { trustApi } from './trust.api';

const reasons = [
  { value: 'SPAM', key: 'trust.reasonSpam' },
  { value: 'HARASSMENT', key: 'trust.reasonHarassment' },
  { value: 'FAKE_PROFILE', key: 'trust.reasonFakeProfile' },
  { value: 'INAPPROPRIATE_CONTENT', key: 'trust.reasonInappropriate' },
  { value: 'SCAM', key: 'trust.reasonScam' },
  { value: 'OTHER', key: 'trust.reasonOther' },
] as const;

export function TrustScreen({
  scope,
}: {
  scope: { userId: string; roleId: string };
}) {
  const { locale, t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const router = useRouter();
  const params = useLocalSearchParams<{
    targetUserId?: string;
    matchId?: string;
    conversationId?: string;
    messageId?: string;
    bookingId?: string;
  }>();
  const client = useQueryClient();
  const [target, setTarget] = useState(params.targetUserId ?? '');
  const [blockReason, setBlockReason] = useState('');
  const [reportReason, setReportReason] =
    useState<(typeof reasons)[number]['value']>('OTHER');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const blocks = useInfiniteQuery({
    queryKey: [...queryKeys.detail(scope, 'trust', 'blocks')],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => trustApi.blocks(pageParam, signal),
    getNextPageParam: (page) => page.nextCursor,
  });
  const blockMutation = useMutation({
    mutationFn: () =>
      trustApi.block(
        target.trim(),
        blockReason.trim(),
        createSubmissionKey().current(),
      ),
    onSuccess: async () => {
      setTarget('');
      setBlockReason('');
      setConfirmBlock(false);
      setFeedback(t('trust.block'));
      await blocks.refetch();
      await client.invalidateQueries({
        queryKey: queryKeys.discoveryRoot(scope),
      });
      await client.invalidateQueries({ queryKey: queryKeys.matches(scope) });
    },
    onError: (caught) =>
      setFeedback(getUserErrorMessage(normalizeError(caught), locale)),
  });
  const unblockMutation = useMutation({
    mutationFn: (blockedUserId: string) => trustApi.unblock(blockedUserId),
    onSuccess: () => void blocks.refetch(),
    onError: (caught) =>
      setFeedback(getUserErrorMessage(normalizeError(caught), locale)),
  });
  const reportMutation = useMutation({
    mutationFn: () =>
      trustApi.report(
        {
          reportedUserId: target.trim(),
          reasonCode: reportReason,
          description: description.trim(),
          matchId: params.matchId,
          conversationId: params.conversationId,
          messageId: params.messageId,
          bookingId: params.bookingId,
          evidenceAssetIds: evidence.length ? evidence : undefined,
        },
        createSubmissionKey().current(),
      ),
    onSuccess: () => {
      setFeedback(t('trust.reportReceived'));
      setDescription('');
      setEvidence([]);
    },
    onError: (caught) =>
      setFeedback(getUserErrorMessage(normalizeError(caught), locale)),
  });
  const items = blocks.data?.pages.flatMap((page) => page.items) ?? [];
  if (blocks.isPending) return <LoadingState label={t('common.loading')} />;
  if (blocks.isError)
    return (
      <ErrorState
        title={t('common.errorLoading')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void blocks.refetch()}
      />
    );
  return (
    <AppScreen>
      <Button
        label={t('trust.back')}
        variant="ghost"
        onPress={() => router.back()}
      />
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.text }]}
      >
        {t('trust.title')}
      </Text>
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        <Text style={[styles.section, { color: palette.text }]}>
          {t('trust.blockSection')}
        </Text>
        <TextField
          label={t('trust.targetLabel')}
          value={target}
          onChangeText={setTarget}
          placeholder={t('trust.targetPlaceholder')}
        />
        <TextField
          label={t('trust.blockReason')}
          value={blockReason}
          onChangeText={setBlockReason}
        />
        <Button
          label={t('trust.block')}
          variant="danger"
          disabled={!target.trim()}
          onPress={() => setConfirmBlock(true)}
        />
      </View>
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        <Text style={[styles.section, { color: palette.text }]}>
          {t('trust.reportSection')}
        </Text>
        <Select
          label={t('trust.reportReason')}
          value={reportReason}
          options={reasons.map((item) => ({
            value: item.value,
            label: t(item.key),
          }))}
          onChange={(value) => setReportReason(value as typeof reportReason)}
        />
        <TextField
          label={t('trust.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={t('trust.descriptionPlaceholder')}
        />
        <View style={styles.actions}>
          <Button
            label={t('trust.attachImage')}
            variant="secondary"
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
              });
              const asset = result.assets?.[0];
              if (result.canceled || !asset) return;
              try {
                const uploaded = await uploadMedia('REPORT_EVIDENCE', asset);
                setEvidence((current) => [
                  ...new Set([...current, uploaded.id]),
                ]);
              } catch (caught) {
                setFeedback(
                  getUserErrorMessage(normalizeError(caught), locale),
                );
              }
            }}
          />
          <Button
            label={t('trust.attachFile')}
            variant="secondary"
            onPress={async () => {
              const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
              });
              const asset = result.canceled ? null : result.assets[0];
              if (!asset) return;
              try {
                const uploaded = await uploadMedia('REPORT_EVIDENCE', asset);
                setEvidence((current) => [
                  ...new Set([...current, uploaded.id]),
                ]);
              } catch (caught) {
                setFeedback(
                  getUserErrorMessage(normalizeError(caught), locale),
                );
              }
            }}
          />
        </View>
        {evidence.length ? (
          <Text style={[styles.muted, { color: palette.muted }]}>
            {t('trust.evidenceCount', { count: evidence.length })}
          </Text>
        ) : null}
        <Button
          label={t('trust.submitReport')}
          disabled={!target.trim() || !description.trim()}
          loading={reportMutation.isPending}
          onPress={() => reportMutation.mutate()}
        />
      </View>
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        <Text style={[styles.section, { color: palette.text }]}>
          {t('trust.blockedSection')}
        </Text>
        {!items.length ? (
          <EmptyState title={t('trust.emptyBlocked')} />
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={[styles.row, { borderBottomColor: palette.border }]}
            >
              <Text style={[styles.flex, { color: palette.text }]}>
                {item.blockedUserId}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => unblockMutation.mutate(item.blockedUserId)}
              >
                <Text style={styles.link}>{t('trust.unblock')}</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
      {feedback ? (
        <Text accessibilityRole="alert" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      <ConfirmDialog
        visible={confirmBlock}
        title={t('trust.blockTitle')}
        message={t('trust.blockMessage')}
        confirmLabel={t('trust.confirmBlock')}
        destructive
        loading={blockMutation.isPending}
        onCancel={() => setConfirmBlock(false)}
        onConfirm={() => blockMutation.mutate()}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: typography.bold,
    fontSize: 26,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  section: {
    fontFamily: typography.bold,
    fontSize: 18,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  flex: { flex: 1 },
  link: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    color: colors.brand,
    fontFamily: typography.semibold,
  },
  feedback: { color: colors.brand },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muted: {},
});

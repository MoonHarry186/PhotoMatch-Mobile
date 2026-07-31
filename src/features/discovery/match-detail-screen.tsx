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

  if (match.isPending) return <LoadingState label="Đang tải kết nối…" />;
  if (match.isError)
    return (
      <ErrorState
        title="Không thể tải kết nối"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void match.refetch()}
        secondaryActionLabel="Quay lại"
        onSecondaryAction={() => router.back()}
      />
    );

  const value = match.data;
  const error = unmatch.error ? normalizeError(unmatch.error) : null;
  return (
    <AppScreen>
      <View style={styles.header}>
        <Button
          label="Quay lại"
          variant="ghost"
          onPress={() => router.back()}
        />
        <StatusBadge
          label={matchStatusLabel(value.status)}
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
          {value.counterpart.displayName ?? 'Người dùng PhotoMatch'}
        </Text>
        <Text style={styles.meta}>
          Kết nối từ {new Date(value.matchedAt).toLocaleString('vi-VN')}
        </Text>
        {value.endedAt ? (
          <Text style={styles.meta}>
            Kết thúc lúc {new Date(value.endedAt).toLocaleString('vi-VN')}
          </Text>
        ) : null}
        {value.endReason ? (
          <Text style={styles.meta}>Lý do: {value.endReason}</Text>
        ) : null}
        <Button
          label="Xem hồ sơ"
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
                ? 'Mở cuộc trò chuyện'
                : 'Xem lịch sử trò chuyện'
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
          title="Đã kết thúc kết nối"
          message="Lịch sử được giữ lại trên server và cuộc trò chuyện đã đóng, nên không thể gửi tin nhắn mới."
        />
      ) : null}
      {value.status === 'ACTIVE' ? (
        <View style={styles.dangerZone}>
          <Text style={styles.sectionTitle}>Kết thúc kết nối</Text>
          <Text style={styles.meta}>
            Hành động này đóng cuộc trò chuyện nhưng không xóa lịch sử.
          </Text>
          <TextField
            label="Lý do"
            value={reason}
            maxLength={500}
            multiline
            onChangeText={setReason}
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {relationshipErrorMessage(error) ?? getUserErrorMessage(error)}
            </Text>
          ) : null}
          <Button
            label="Kết thúc kết nối"
            variant="danger"
            disabled={!reason.trim()}
            onPress={() => setConfirmVisible(true)}
          />
        </View>
      ) : (
        <Text style={styles.closed}>
          Kết nối không còn hoạt động. Lịch sử vẫn được giữ nhưng không được tạo
          tương tác mới từ màn hình này.
        </Text>
      )}

      <ConfirmDialog
        visible={confirmVisible}
        title={`Kết thúc kết nối với ${value.counterpart.displayName ?? 'người dùng này'}?`}
        message="Cuộc trò chuyện sẽ đóng và không thể gửi tin nhắn mới. Lịch sử vẫn được giữ lại."
        confirmLabel="Kết thúc kết nối"
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

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
import { normalizeError } from '@/core/errors';
import { createSubmissionKey } from '@/services/api/idempotency';
import { queryKeys } from '@/services/api/query-keys';
import { uploadMedia } from '@/services/media/upload';
import { colors, radius, spacing, typography } from '@/theme';

import { trustApi } from './trust.api';

const reasons = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Quấy rối' },
  { value: 'FAKE_PROFILE', label: 'Hồ sơ giả' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Nội dung không phù hợp' },
  { value: 'SCAM', label: 'Lừa đảo' },
  { value: 'OTHER', label: 'Khác' },
] as const;

export function TrustScreen({
  scope,
}: {
  scope: { userId: string; roleId: string };
}) {
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
      setFeedback('Đã chặn tài khoản. Các tương tác mới đã được đóng.');
      await blocks.refetch();
      await client.invalidateQueries({
        queryKey: queryKeys.discoveryRoot(scope),
      });
      await client.invalidateQueries({ queryKey: queryKeys.matches(scope) });
    },
    onError: (caught) => setFeedback(normalizeError(caught).message),
  });
  const unblockMutation = useMutation({
    mutationFn: (blockedUserId: string) => trustApi.unblock(blockedUserId),
    onSuccess: () => void blocks.refetch(),
    onError: (caught) => setFeedback(normalizeError(caught).message),
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
      setFeedback(
        'Đã tiếp nhận báo cáo. Việc tiếp nhận không khẳng định kết quả xử lý.',
      );
      setDescription('');
      setEvidence([]);
    },
    onError: (caught) => setFeedback(normalizeError(caught).message),
  });
  const items = blocks.data?.pages.flatMap((page) => page.items) ?? [];
  if (blocks.isPending)
    return <LoadingState label="Đang tải danh sách chặn…" />;
  if (blocks.isError)
    return (
      <ErrorState
        title="Không thể tải danh sách chặn"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void blocks.refetch()}
      />
    );
  return (
    <AppScreen>
      <Button label="Quay lại" variant="ghost" onPress={() => router.back()} />
      <Text accessibilityRole="header" style={styles.title}>
        An toàn và quyền riêng tư
      </Text>
      <View style={styles.card}>
        <Text style={styles.section}>Chặn người dùng</Text>
        <TextField
          label="ID người dùng cần chặn"
          value={target}
          onChangeText={setTarget}
          placeholder="Dán ID từ hồ sơ hoặc cuộc trò chuyện"
        />
        <TextField
          label="Lý do (không bắt buộc)"
          value={blockReason}
          onChangeText={setBlockReason}
        />
        <Button
          label="Chặn tài khoản"
          variant="danger"
          disabled={!target.trim()}
          onPress={() => setConfirmBlock(true)}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.section}>Báo cáo</Text>
        <Select
          label="Lý do báo cáo"
          value={reportReason}
          options={reasons.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
          onChange={(value) => setReportReason(value as typeof reportReason)}
        />
        <TextField
          label="Mô tả"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Mô tả ngắn gọn, không đưa thông tin nhạy cảm không cần thiết"
        />
        <View style={styles.actions}>
          <Button
            label="Đính kèm ảnh"
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
                setFeedback(normalizeError(caught).message);
              }
            }}
          />
          <Button
            label="Đính kèm tệp"
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
                setFeedback(normalizeError(caught).message);
              }
            }}
          />
        </View>
        {evidence.length ? (
          <Text style={styles.muted}>Đã đính kèm {evidence.length} tệp.</Text>
        ) : null}
        <Button
          label="Gửi báo cáo"
          disabled={!target.trim() || !description.trim()}
          loading={reportMutation.isPending}
          onPress={() => reportMutation.mutate()}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.section}>Đã chặn</Text>
        {!items.length ? (
          <EmptyState title="Chưa chặn ai" />
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Text style={styles.flex}>{item.blockedUserId}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => unblockMutation.mutate(item.blockedUserId)}
              >
                <Text style={styles.link}>Bỏ chặn</Text>
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
        title="Chặn tài khoản này?"
        message="Bạn sẽ không thể tạo tương tác mới với tài khoản này. Lịch sử hợp lệ không bị xóa."
        confirmLabel="Chặn"
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
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 26,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
  },
  section: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  flex: { flex: 1, color: colors.light.text },
  link: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    color: colors.brand,
    fontFamily: typography.semibold,
  },
  feedback: { color: colors.brand },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muted: { color: colors.light.muted },
});

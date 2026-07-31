import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  ActionFeedback,
  ErrorState,
  LoadingState,
} from '@/components/feedback';
import { AppScreen } from '@/components/layout/app-screen';
import { Button, ConfirmDialog, TextField } from '@/components/ui';
import { normalizeError } from '@/core/errors';
import { createSubmissionKey } from '@/services/api/idempotency';
import { queryKeys } from '@/services/api/query-keys';
import { colors, spacing, typography } from '@/theme';

import { bookingApi, validateReviewInput } from './booking.api';
import { bookingStatusLabel } from './booking-list';

export function BookingDetailScreen({
  bookingId,
  scope,
}: {
  bookingId: string;
  scope: { userId: string; roleId: string };
}) {
  const router = useRouter();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState<
    | 'ACCEPTED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'DISPUTED'
    | null
  >(null);
  const [reason, setReason] = useState('');
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const booking = useQuery({
    queryKey: queryKeys.booking(scope, bookingId),
    queryFn: ({ signal }) => bookingApi.detail(bookingId, signal),
  });
  const review = useQuery({
    queryKey: queryKeys.bookingReview(scope, bookingId),
    queryFn: ({ signal }) => bookingApi.review(bookingId, signal),
    retry: false,
    enabled: Boolean(booking.data?.status === 'COMPLETED'),
  });
  const transition = useMutation({
    mutationFn: (status: NonNullable<typeof confirm>) =>
      bookingApi.transition(
        bookingId,
        { status, ...(reason.trim() ? { reason: reason.trim() } : {}) },
        createSubmissionKey().current(),
      ),
    onSuccess: async (value) => {
      setConfirm(null);
      setReason('');
      client.setQueryData(queryKeys.booking(scope, bookingId), value);
      await client.invalidateQueries({ queryKey: queryKeys.bookings(scope) });
    },
    onError: (caught) => {
      setFeedback(normalizeError(caught).message);
      void booking.refetch();
    },
  });
  const editMutation = useMutation({
    mutationFn: () =>
      bookingApi.update(bookingId, {
        agreedPrice: Number(editPrice),
        address: editAddress.trim(),
      }),
    onSuccess: (value) => {
      client.setQueryData(queryKeys.booking(scope, bookingId), value);
      setEditing(false);
      setFeedback('Đã cập nhật yêu cầu đặt lịch.');
    },
    onError: (caught) => setFeedback(normalizeError(caught).message),
  });
  const reviewMutation = useMutation({
    mutationFn: () =>
      bookingApi.createReview(
        bookingId,
        { rating: Number(rating), comment: comment.trim() || undefined },
        createSubmissionKey().current(),
      ),
    onSuccess: async (value) => {
      client.setQueryData(queryKeys.bookingReview(scope, bookingId), value);
      setFeedback('Đã gửi đánh giá. Đánh giá đã chuyển sang chế độ chỉ đọc.');
      await client.invalidateQueries({
        queryKey: queryKeys.booking(scope, bookingId),
      });
      const photographerRoleId = booking.data?.photographerUserRoleId;
      if (photographerRoleId) {
        await client.invalidateQueries({
          queryKey: queryKeys.publicReviews(photographerRoleId),
        });
        await client.invalidateQueries({
          queryKey: queryKeys.publicProfile(photographerRoleId),
        });
      }
    },
    onError: (caught) => setFeedback(normalizeError(caught).message),
  });
  const actions = useMemo((): NonNullable<typeof confirm>[] => {
    if (!booking.data) return [];
    const status = booking.data.status;
    const isCustomer = booking.data.customerUserRoleId === scope.roleId;
    if (status === 'PENDING')
      return isCustomer ? ['CANCELLED'] : ['ACCEPTED', 'REJECTED'];
    if (status === 'ACCEPTED')
      return isCustomer
        ? ['CANCELLED', 'DISPUTED']
        : ['IN_PROGRESS', 'CANCELLED'];
    if (status === 'IN_PROGRESS') return ['COMPLETED', 'DISPUTED'];
    return [];
  }, [booking.data, scope.roleId]);
  if (booking.isPending) return <LoadingState label="Đang tải lịch chụp…" />;
  if (booking.isError || !booking.data)
    return (
      <ErrorState
        title="Không thể tải lịch chụp"
        primaryActionLabel="Thử lại"
        onPrimaryAction={() => void booking.refetch()}
        secondaryActionLabel="Quay lại"
        onSecondaryAction={() => router.back()}
      />
    );
  const value = booking.data;
  return (
    <AppScreen>
      <Button label="Quay lại" variant="ghost" onPress={() => router.back()} />
      <Text accessibilityRole="header" style={styles.title}>
        Lịch chụp
      </Text>
      <View style={styles.card}>
        <Text style={styles.status}>{bookingStatusLabel(value.status)}</Text>
        <Text>
          Thời gian: {new Date(value.scheduledStart).toLocaleString('vi-VN')} –{' '}
          {new Date(value.scheduledEnd).toLocaleString('vi-VN')}
        </Text>
        <Text>Địa chỉ: {value.address ?? 'Chưa cập nhật'}</Text>
        <Text>
          Giá: {value.agreedPrice?.toLocaleString('vi-VN') ?? 'Chưa cập nhật'}{' '}
          {value.currency ?? 'VND'}
        </Text>
        {value.note ? <Text>Ghi chú: {value.note}</Text> : null}
      </View>
      {Array.isArray((value as { history?: unknown }).history) ? (
        <View style={styles.review}>
          <Text style={styles.section}>Lịch sử trạng thái</Text>
          {(
            value as unknown as {
              history: {
                status?: string;
                note?: string;
                changedAt?: string;
              }[];
            }
          ).history.map((entry, index) => (
            <Text
              key={`${entry.changedAt ?? index}-${entry.status ?? 'status'}`}
            >
              {entry.changedAt
                ? new Date(entry.changedAt).toLocaleString('vi-VN')
                : ''}{' '}
              {bookingStatusLabel(entry.status ?? '')}
              {entry.note ? ` · ${entry.note}` : ''}
            </Text>
          ))}
        </View>
      ) : null}
      {value.status === 'PENDING' && value.creatorUserId === scope.userId ? (
        <View style={styles.review}>
          {editing ? (
            <>
              <TextField
                label="Giá thỏa thuận (VND)"
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="number-pad"
              />
              <TextField
                label="Địa chỉ"
                value={editAddress}
                onChangeText={setEditAddress}
              />
              <Button
                label="Lưu thay đổi"
                loading={editMutation.isPending}
                disabled={!editAddress.trim() || Number(editPrice) <= 0}
                onPress={() => editMutation.mutate()}
              />
              <Button
                label="Hủy chỉnh sửa"
                variant="ghost"
                onPress={() => setEditing(false)}
              />
            </>
          ) : (
            <Button
              label="Chỉnh sửa yêu cầu"
              variant="secondary"
              onPress={() => {
                setEditPrice(String(value.agreedPrice ?? ''));
                setEditAddress(value.address ?? '');
                setEditing(true);
              }}
            />
          )}
        </View>
      ) : null}
      <View style={styles.actions}>
        {actions.map((action) => (
          <Button
            key={action}
            label={bookingStatusLabel(action)}
            variant={
              action === 'REJECTED' ||
              action === 'CANCELLED' ||
              action === 'DISPUTED'
                ? 'danger'
                : 'secondary'
            }
            onPress={() => setConfirm(action)}
          />
        ))}
      </View>
      {feedback ? <ActionFeedback title="Cập nhật" message={feedback} /> : null}
      {value.status === 'COMPLETED' ? (
        <View style={styles.review}>
          {review.data ? (
            <>
              <Text style={styles.section}>Đánh giá của bạn</Text>
              <Text>
                {'★'.repeat(review.data.rating)} ·{' '}
                {review.data.comment ?? 'Không có nhận xét'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.section}>Đánh giá Photographer</Text>
              <TextField
                label="Số sao (1–5)"
                keyboardType="number-pad"
                value={rating}
                onChangeText={setRating}
              />
              <TextField
                label="Nhận xét (không bắt buộc)"
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <Button
                label="Gửi đánh giá"
                disabled={
                  !validateReviewInput(
                    Number(rating),
                    comment.trim() || undefined,
                  )
                }
                loading={reviewMutation.isPending}
                onPress={() => reviewMutation.mutate()}
              />
            </>
          )}
        </View>
      ) : null}
      <ConfirmDialog
        visible={Boolean(confirm)}
        title={`Xác nhận ${confirm ? bookingStatusLabel(confirm).toLowerCase() : ''}`}
        message="Hành động sẽ được kiểm tra lại theo trạng thái canonical trên server."
        confirmLabel="Xác nhận"
        destructive={
          confirm === 'REJECTED' ||
          confirm === 'CANCELLED' ||
          confirm === 'DISPUTED'
        }
        loading={transition.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && transition.mutate(confirm)}
      />
      <TextField
        label="Lý do (nếu cần)"
        value={reason}
        onChangeText={setReason}
        multiline
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
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.light.surface,
  },
  status: { color: colors.brand, fontFamily: typography.semibold },
  actions: { gap: spacing.sm },
  review: { gap: spacing.sm, paddingTop: spacing.md },
  section: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 18,
  },
});

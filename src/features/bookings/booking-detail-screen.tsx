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
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { createSubmissionKey } from '@/services/api/idempotency';
import { queryKeys } from '@/services/api/query-keys';
import { useTheme } from '@/providers/theme-provider';
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
  const { t, locale } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
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
      setFeedback(getUserErrorMessage(normalizeError(caught), locale));
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
      setFeedback(t('booking.updateSuccess'));
    },
    onError: (caught) =>
      setFeedback(getUserErrorMessage(normalizeError(caught), locale)),
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
      setFeedback(t('booking.reviewSubmitted'));
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
    onError: (caught) =>
      setFeedback(getUserErrorMessage(normalizeError(caught), locale)),
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
  if (booking.isPending) return <LoadingState label={t('booking.loading')} />;
  if (booking.isError || !booking.data)
    return (
      <ErrorState
        title={t('booking.loadError')}
        primaryActionLabel={t('common.retry')}
        onPrimaryAction={() => void booking.refetch()}
        secondaryActionLabel={t('booking.back')}
        onSecondaryAction={() => router.back()}
      />
    );
  const value = booking.data;
  return (
    <AppScreen>
      <Button
        label={t('booking.back')}
        variant="ghost"
        onPress={() => router.back()}
      />
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.text }]}
      >
        {t('booking.detailTitle')}
      </Text>
      <View style={[styles.card, { backgroundColor: palette.surface }]}>
        <Text style={[styles.status, { color: palette.info }]}>
          {bookingStatusLabel(value.status, t)}
        </Text>
        <Text style={{ color: palette.text }}>
          {t('booking.time')}:{' '}
          {new Date(value.scheduledStart).toLocaleString(
            locale === 'en' ? 'en-US' : 'vi-VN',
          )}{' '}
          –{' '}
          {new Date(value.scheduledEnd).toLocaleString(
            locale === 'en' ? 'en-US' : 'vi-VN',
          )}
        </Text>
        <Text style={{ color: palette.text }}>
          {t('booking.addressValue')}:{' '}
          {value.address ?? t('booking.notUpdated')}
        </Text>
        <Text style={{ color: palette.text }}>
          {t('booking.priceValue')}:{' '}
          {value.agreedPrice?.toLocaleString(
            locale === 'en' ? 'en-US' : 'vi-VN',
          ) ?? t('booking.notUpdated')}{' '}
          {value.currency ?? 'VND'}
        </Text>
        {value.note ? (
          <Text style={{ color: palette.text }}>
            {t('booking.noteValue')}: {value.note}
          </Text>
        ) : null}
      </View>
      {Array.isArray((value as { history?: unknown }).history) ? (
        <View style={styles.review}>
          <Text style={[styles.section, { color: palette.text }]}>
            {t('booking.statusHistory')}
          </Text>
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
                ? new Date(entry.changedAt).toLocaleString(
                    locale === 'en' ? 'en-US' : 'vi-VN',
                  )
                : ''}{' '}
              {bookingStatusLabel(entry.status ?? '', t)}
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
                label={t('booking.price')}
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="number-pad"
              />
              <TextField
                label={t('booking.address')}
                value={editAddress}
                onChangeText={setEditAddress}
              />
              <Button
                label={t('booking.saveChanges')}
                loading={editMutation.isPending}
                disabled={!editAddress.trim() || Number(editPrice) <= 0}
                onPress={() => editMutation.mutate()}
              />
              <Button
                label={t('booking.cancelEdit')}
                variant="ghost"
                onPress={() => setEditing(false)}
              />
            </>
          ) : (
            <Button
              label={t('booking.editRequest')}
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
            label={bookingStatusLabel(action, t)}
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
      {feedback ? (
        <ActionFeedback
          title={t('booking.updateFeedback')}
          message={feedback}
        />
      ) : null}
      {value.status === 'COMPLETED' ? (
        <View style={styles.review}>
          {review.data ? (
            <>
              <Text style={[styles.section, { color: palette.text }]}>
                {t('booking.yourReview')}
              </Text>
              <Text style={{ color: palette.text }}>
                {'★'.repeat(review.data.rating)} ·{' '}
                {review.data.comment ?? t('booking.noComment')}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.section, { color: palette.text }]}>
                {t('booking.photographerReview')}
              </Text>
              <TextField
                label={t('booking.rating')}
                keyboardType="number-pad"
                value={rating}
                onChangeText={setRating}
              />
              <TextField
                label={t('booking.comment')}
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <Button
                label={t('booking.submitReview')}
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
        title={t('booking.confirmStatus', {
          status: confirm ? bookingStatusLabel(confirm, t).toLowerCase() : '',
        })}
        message={t('booking.confirmMessage')}
        confirmLabel={t('booking.confirm')}
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
        label={t('booking.reason')}
        value={reason}
        onChangeText={setReason}
        multiline
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
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: 16,
  },
  status: { fontFamily: typography.semibold },
  actions: { gap: spacing.sm },
  review: { gap: spacing.sm, paddingTop: spacing.md },
  section: {
    fontFamily: typography.bold,
    fontSize: 18,
  },
});

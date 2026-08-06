import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, DateTimeField, TextField } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import type { CreateBookingDto } from '@/generated/api/types.gen';
import { useI18n } from '@/i18n/i18n-provider';
import { createSubmissionKey } from '@/services/api/idempotency';
import { queryKeys } from '@/services/api/query-keys';
import { useTheme } from '@/providers/theme-provider';
import { colors, spacing } from '@/theme';

import { bookingApi } from './booking.api';

export function BookingCreateForm({
  photographerRoleId,
  customerRoleId,
  serviceId,
  conversationId,
  scope,
}: {
  photographerRoleId: string;
  customerRoleId?: string;
  serviceId: string;
  conversationId?: string;
  scope: { userId: string; roleId: string };
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const queryClient = useQueryClient();
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const idempotency = useMemo(() => createSubmissionKey(), []);
  const mutation = useMutation({
    mutationFn: (input: CreateBookingDto) =>
      bookingApi.create(input, idempotency.current()),
    onSuccess: async (booking) => {
      idempotency.complete();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.bookings(scope),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.conversations(scope),
      });
      if (conversationId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.detail(scope, 'conversation', conversationId),
        });
      }
      router.replace({
        pathname: '/(details)/booking/[id]',
        params: { id: booking.id },
      });
    },
    onError: (caught) =>
      setError(getUserErrorMessage(normalizeError(caught), locale)),
  });
  const submit = () => {
    if (!start || !end || end <= start)
      return setError(t('booking.invalidTime'));
    const agreedPrice = Number(price);
    if (!address.trim() || !Number.isFinite(agreedPrice) || agreedPrice <= 0)
      return setError(t('booking.invalidAddressPrice'));
    setError(null);
    mutation.mutate({
      photographerUserRoleId: photographerRoleId,
      customerUserRoleId: customerRoleId,
      conversationId,
      serviceId,
      agreedPrice,
      currency: 'VND',
      scheduledStart: start.toISOString(),
      scheduledEnd: end.toISOString(),
      address: address.trim(),
      note: note.trim() || undefined,
    });
  };
  return (
    <AppScreen>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.text }]}
      >
        {t('booking.createTitle')}
      </Text>
      <Text style={[styles.hint, { color: palette.muted }]}>
        {t('booking.createHint')}
      </Text>
      <DateTimeField
        label={t('booking.start')}
        value={start}
        onChange={setStart}
        mode="date"
      />
      <DateTimeField
        label={t('booking.end')}
        value={end}
        onChange={setEnd}
        mode="date"
        minimumDate={start ?? undefined}
      />
      <TextField
        label={t('booking.address')}
        value={address}
        onChangeText={setAddress}
        placeholder={t('booking.addressPlaceholder')}
      />
      <TextField
        label={t('booking.price')}
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
      />
      <TextField
        label={t('booking.note')}
        value={note}
        onChangeText={setNote}
        multiline
      />
      <Text style={[styles.error, { color: palette.error }]}>
        {error ?? ''}
      </Text>
      <Button
        label={t('booking.submit')}
        loading={mutation.isPending}
        onPress={submit}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700' },
  hint: { marginBottom: spacing.sm },
  error: { minHeight: 22 },
});

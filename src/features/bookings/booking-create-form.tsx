import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, DateTimeField, TextField } from '@/components/ui';
import { normalizeError } from '@/core/errors';
import type { CreateBookingDto } from '@/generated/api/types.gen';
import { createSubmissionKey } from '@/services/api/idempotency';
import { queryKeys } from '@/services/api/query-keys';
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
    onError: (caught) => setError(normalizeError(caught).message),
  });
  const submit = () => {
    if (!start || !end || end <= start)
      return setError('Thời gian kết thúc phải sau thời gian bắt đầu.');
    const agreedPrice = Number(price);
    if (!address.trim() || !Number.isFinite(agreedPrice) || agreedPrice <= 0)
      return setError('Vui lòng nhập địa chỉ và giá hợp lệ.');
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
      <Text accessibilityRole="header" style={styles.title}>
        Đặt lịch chụp
      </Text>
      <Text style={styles.hint}>
        Thông tin sẽ được gửi tới Photographer để xác nhận.
      </Text>
      <DateTimeField
        label="Bắt đầu"
        value={start}
        onChange={setStart}
        mode="date"
      />
      <DateTimeField
        label="Kết thúc"
        value={end}
        onChange={setEnd}
        mode="date"
        minimumDate={start ?? undefined}
      />
      <TextField
        label="Địa chỉ"
        value={address}
        onChangeText={setAddress}
        placeholder="Nhập địa chỉ buổi chụp"
      />
      <TextField
        label="Giá thỏa thuận (VND)"
        value={price}
        onChangeText={setPrice}
        keyboardType="number-pad"
      />
      <TextField
        label="Ghi chú (không bắt buộc)"
        value={note}
        onChangeText={setNote}
        multiline
      />
      <Text style={styles.error}>{error ?? ''}</Text>
      <Button
        label="Gửi yêu cầu đặt lịch"
        loading={mutation.isPending}
        onPress={submit}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.light.text, fontSize: 26, fontWeight: '700' },
  hint: { color: colors.light.muted, marginBottom: spacing.sm },
  error: { minHeight: 22, color: colors.light.error },
});

import { ActionBottomSheet } from '@/components/overlays';
import type { AppError } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';

const conflictCodes = new Set([
  'BOOKING_ALREADY_ACCEPTED',
  'BOOKING_TIME_UNAVAILABLE',
  'PHOTOGRAPHER_UNAVAILABLE',
]);

export function isBookingConflict(error: AppError): boolean {
  return (
    error.code === 'CONFLICT' && conflictCodes.has(error.businessCode ?? '')
  );
}

export function BookingConflictSheet({
  error,
  onChooseAnotherTime,
  onFindAnotherPhotographer,
  onDismiss,
}: {
  error: AppError | null;
  onChooseAnotherTime: () => void;
  onFindAnotherPhotographer: () => void;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  return (
    <ActionBottomSheet
      visible={Boolean(error && isBookingConflict(error))}
      title={t('booking.conflictTitle')}
      description={t('booking.conflictDescription')}
      onDismiss={onDismiss}
      actions={[
        {
          label: t('booking.chooseAnotherTime'),
          variant: 'primary',
          onPress: onChooseAnotherTime,
        },
        {
          label: t('booking.findAnotherPhotographer'),
          onPress: onFindAnotherPhotographer,
        },
        { label: t('common.close'), variant: 'ghost', onPress: onDismiss },
      ]}
    />
  );
}

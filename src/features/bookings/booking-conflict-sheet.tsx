import { ActionBottomSheet } from '@/components/overlays';
import type { AppError } from '@/core/errors';

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
  return (
    <ActionBottomSheet
      visible={Boolean(error && isBookingConflict(error))}
      title="Lịch chụp không còn khả dụng"
      description="Photographer này vừa nhận một lịch khác vào thời gian bạn đã chọn."
      onDismiss={onDismiss}
      actions={[
        {
          label: 'Chọn thời gian khác',
          variant: 'primary',
          onPress: onChooseAnotherTime,
        },
        {
          label: 'Tìm photographer khác',
          onPress: onFindAnotherPhotographer,
        },
        { label: 'Đóng', variant: 'ghost', onPress: onDismiss },
      ]}
    />
  );
}

import type { BookingResponse } from '@/generated/api/types.gen';

import type { Locale } from './messages';

type BookingStatus = BookingResponse['status'];

const bookingStatus: Record<BookingStatus, Record<Locale, string>> = {
  DRAFT: { vi: 'Bản nháp', en: 'Draft' },
  PENDING: { vi: 'Chờ xác nhận', en: 'Pending' },
  ACCEPTED: { vi: 'Đã chấp nhận', en: 'Accepted' },
  REJECTED: { vi: 'Đã từ chối', en: 'Rejected' },
  CANCELLED: { vi: 'Đã hủy', en: 'Cancelled' },
  IN_PROGRESS: { vi: 'Đang thực hiện', en: 'In progress' },
  COMPLETED: { vi: 'Hoàn tất', en: 'Completed' },
  DISPUTED: { vi: 'Đang khiếu nại', en: 'Disputed' },
};

const apiErrors: Record<string, Record<Locale, string>> = {
  INVALID_CREDENTIALS: {
    vi: 'Email hoặc mật khẩu không đúng.',
    en: 'The email or password is incorrect.',
  },
  EMAIL_ALREADY_EXISTS: {
    vi: 'Email này đã được sử dụng.',
    en: 'This email is already in use.',
  },
  STALE_LEGAL_VERSION: {
    vi: 'Điều khoản đã được cập nhật. Vui lòng xem lại.',
    en: 'The legal terms have changed. Please review them again.',
  },
};

export function localizedBookingStatus(status: string, locale: Locale): string {
  return (
    bookingStatus[status as BookingStatus]?.[locale] ??
    (locale === 'vi' ? 'Không xác định' : 'Unknown')
  );
}

export function localizedApiError(code: string, locale: Locale): string {
  return (
    apiErrors[code]?.[locale] ??
    (locale === 'vi'
      ? 'Không thể hoàn tất yêu cầu.'
      : 'The request could not be completed.')
  );
}

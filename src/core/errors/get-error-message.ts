import type { AppError } from './app-error';
import type { Locale } from '@/i18n/messages';

const messages = {
  vi: {
    NETWORK_ERROR: 'Không có kết nối mạng. Vui lòng kiểm tra Internet.',
    UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn.',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
    NOT_FOUND: 'Không tìm thấy dữ liệu.',
    VALIDATION_ERROR: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
    CONFLICT: 'Dữ liệu vừa thay đổi. Vui lòng kiểm tra và thử lại.',
    RATE_LIMITED: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
    SERVER_ERROR: 'Hệ thống đang gặp sự cố. Vui lòng thử lại.',
    UNKNOWN_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
  },
  en: {
    NETWORK_ERROR: 'No network connection. Check your internet connection.',
    UNAUTHORIZED: 'Your session has expired.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'The requested data could not be found.',
    VALIDATION_ERROR: 'Some information is invalid. Please check it again.',
    CONFLICT: 'The data has changed. Check it and try again.',
    RATE_LIMITED: 'Too many attempts. Please try again later.',
    SERVER_ERROR: 'The system is currently unavailable. Please try again.',
    UNKNOWN_ERROR: 'Something went wrong. Please try again.',
  },
} as const;

export function getUserErrorMessage(
  error: AppError,
  locale: Locale = 'vi',
): string {
  return messages[locale][error.code];
}

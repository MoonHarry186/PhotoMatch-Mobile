import type { AppError } from './app-error';

const messages = {
  NETWORK_ERROR: 'Không có kết nối mạng. Vui lòng kiểm tra Internet.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu.',
  VALIDATION_ERROR: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.',
  CONFLICT: 'Dữ liệu vừa thay đổi. Vui lòng kiểm tra và thử lại.',
  RATE_LIMITED: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  SERVER_ERROR: 'Hệ thống đang gặp sự cố. Vui lòng thử lại.',
  UNKNOWN_ERROR: 'Đã xảy ra lỗi. Vui lòng thử lại.',
} as const;

export function getUserErrorMessage(error: AppError): string {
  return messages[error.code];
}

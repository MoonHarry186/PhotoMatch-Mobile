import { ApiError } from '@/services/api/api-error';

export function isTerminalSessionError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 401 ||
      [
        'REFRESH_TOKEN_INVALID',
        'REFRESH_TOKEN_REVOKED',
        'REFRESH_TOKEN_REUSED',
        'SESSION_REVOKED',
      ].includes(error.code))
  );
}

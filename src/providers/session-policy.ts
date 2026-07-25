import { AppError } from '@/core/errors';

export function isTerminalSessionError(error: unknown): boolean {
  return (
    error instanceof AppError &&
    (error.code === 'UNAUTHORIZED' ||
      [
        'REFRESH_TOKEN_INVALID',
        'REFRESH_TOKEN_REVOKED',
        'REFRESH_TOKEN_REUSED',
        'SESSION_REVOKED',
      ].includes(error.businessCode ?? ''))
  );
}

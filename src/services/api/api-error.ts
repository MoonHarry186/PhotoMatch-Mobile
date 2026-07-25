import {
  AppError,
  normalizeError,
  type AppError as AppErrorType,
} from '@/core/errors';

export { AppError as ApiError };

export function toApiError(error: unknown, response?: Response): AppErrorType {
  return normalizeError(error, response);
}

export function fieldErrors(error: AppErrorType): Record<string, string> {
  return Object.fromEntries(
    Object.entries(error.fieldErrors ?? {}).flatMap(([field, messages]) =>
      messages[0] ? [[field, messages[0]]] : [],
    ),
  );
}

import { toApiError } from './api-error';

type GeneratedResult<T> = {
  data?: T;
  error?: unknown;
  response?: Response;
};

export function unwrap<T>(result: GeneratedResult<T>): NonNullable<T> {
  if (result.data !== undefined) return result.data as NonNullable<T>;
  throw toApiError(result.error, result.response);
}

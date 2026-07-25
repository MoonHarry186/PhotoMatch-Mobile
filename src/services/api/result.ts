import { normalizeError } from '@/core/errors';

type GeneratedResult<T> = {
  data?: T;
  error?: unknown;
  response?: Response;
};

export function unwrap<T>(result: GeneratedResult<T>): NonNullable<T> {
  if (result.data !== undefined) return result.data as NonNullable<T>;
  throw normalizeError(result.error, result.response);
}

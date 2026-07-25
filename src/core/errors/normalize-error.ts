import { AppError, type AppErrorCode } from './app-error';

type ErrorPayload = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  fieldErrors?: unknown;
  requestId?: unknown;
  status?: unknown;
  name?: unknown;
};

const canonicalCodes = new Set<AppErrorCode>([
  'NETWORK_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'UNKNOWN_ERROR',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeFields(value: unknown): Record<string, string[]> | undefined {
  if (!isRecord(value)) return undefined;
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(value)) {
    if (typeof messages === 'string') {
      result[field] = [messages];
      continue;
    }
    if (Array.isArray(messages)) {
      const safe = messages.filter(
        (message): message is string => typeof message === 'string',
      );
      if (safe.length) result[field] = safe;
    }
  }
  return Object.keys(result).length ? result : undefined;
}

function fieldsFromPayload(payload: ErrorPayload) {
  const details = isRecord(payload.details) ? payload.details : undefined;
  return normalizeFields(
    payload.fieldErrors ?? details?.fieldErrors ?? details?.fields,
  );
}

export function mapHttpStatus(status?: number): AppErrorCode {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422 || status === 400) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMITED';
  if (status !== undefined && status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN_ERROR';
}

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!isRecord(error)) return false;
  const name = typeof error.name === 'string' ? error.name : '';
  const code = typeof error.code === 'string' ? error.code : '';
  return (
    name === 'AbortError' ||
    name === 'NetworkError' ||
    code === 'NETWORK_ERROR' ||
    code === 'ERR_NETWORK'
  );
}

function payloadFrom(error: unknown): ErrorPayload | null {
  return isRecord(error) ? (error as ErrorPayload) : null;
}

export function normalizeError(error: unknown, response?: Response): AppError {
  if (error instanceof AppError) return error;

  const payload = payloadFrom(error);
  const status =
    response?.status ??
    (typeof payload?.status === 'number' ? payload.status : undefined);
  const rawCode = typeof payload?.code === 'string' ? payload.code : undefined;
  const code =
    rawCode && canonicalCodes.has(rawCode as AppErrorCode)
      ? (rawCode as AppErrorCode)
      : isNetworkFailure(error) && status === undefined
        ? 'NETWORK_ERROR'
        : mapHttpStatus(status);
  const requestId =
    (typeof payload?.requestId === 'string' ? payload.requestId : undefined) ??
    response?.headers.get('x-request-id') ??
    undefined;
  const message =
    typeof payload?.message === 'string'
      ? payload.message
      : code === 'NETWORK_ERROR'
        ? 'Network request failed'
        : 'An unexpected error occurred';

  return new AppError({
    code,
    message,
    status,
    retryable:
      code === 'NETWORK_ERROR' ||
      code === 'SERVER_ERROR' ||
      code === 'RATE_LIMITED',
    fieldErrors: payload ? fieldsFromPayload(payload) : undefined,
    requestId,
    cause: error,
    businessCode:
      rawCode && !canonicalCodes.has(rawCode as AppErrorCode)
        ? rawCode
        : undefined,
  });
}

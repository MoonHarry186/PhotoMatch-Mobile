import { z } from 'zod';

const errorBodySchema = z.object({
  code: z.string().default('UNKNOWN_ERROR'),
  message: z.string().default('An unexpected error occurred'),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export class ApiError extends Error {
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly status?: number;

  constructor(input: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
    status?: number;
  }) {
    super(input.message);
    this.name = 'ApiError';
    this.code = input.code;
    if (input.details !== undefined) this.details = input.details;
    if (input.requestId !== undefined) this.requestId = input.requestId;
    if (input.status !== undefined) this.status = input.status;
  }
}

export function toApiError(error: unknown, response?: Response): ApiError {
  if (error instanceof ApiError) return error;
  const parsed = errorBodySchema.safeParse(error);
  if (parsed.success) {
    return new ApiError({
      ...parsed.data,
      requestId:
        parsed.data.requestId ??
        response?.headers.get('x-request-id') ??
        undefined,
      status: response?.status,
    });
  }
  return new ApiError({
    code: response ? `HTTP_${response.status}` : 'NETWORK_ERROR',
    message: response
      ? 'The request could not be completed'
      : 'Network request failed',
    requestId: response?.headers.get('x-request-id') ?? undefined,
    status: response?.status,
  });
}

export function fieldErrors(error: ApiError): Record<string, string> {
  if (!error.details || typeof error.details !== 'object') return {};
  const fields = 'fields' in error.details ? error.details.fields : undefined;
  return fields && typeof fields === 'object'
    ? (fields as Record<string, string>)
    : {};
}

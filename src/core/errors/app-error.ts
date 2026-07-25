export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppErrorOptions {
  code: AppErrorCode;
  message: string;
  status?: number;
  retryable?: boolean;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
  cause?: unknown;
  businessCode?: string;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string[]>;
  readonly requestId?: string;
  readonly cause?: unknown;
  readonly businessCode?: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    if (options.status !== undefined) this.status = options.status;
    if (options.fieldErrors !== undefined)
      this.fieldErrors = options.fieldErrors;
    if (options.requestId !== undefined) this.requestId = options.requestId;
    if (options.cause !== undefined) this.cause = options.cause;
    if (options.businessCode !== undefined)
      this.businessCode = options.businessCode;
  }
}

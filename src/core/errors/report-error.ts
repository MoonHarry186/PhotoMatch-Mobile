import * as Sentry from '@sentry/react-native';

import { env } from '@/config/env';

import type { AppError } from './app-error';
import { normalizeError } from './normalize-error';

const sensitiveFragments = [
  'authorization',
  'accesstoken',
  'refreshtoken',
  'password',
  'otp',
  'token',
  'cccd',
  'identity',
  'latitude',
  'longitude',
  'payment',
  'cardnumber',
  'signedurl',
  'devicetoken',
  'message',
  'comment',
  'image',
  'requestbody',
];

function isSensitive(key: string) {
  const normalized = key.replaceAll(/[^a-z]/gi, '').toLowerCase();
  return sensitiveFragments.some((fragment) => normalized.includes(fragment));
}

export function sanitizeErrorContext(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (Array.isArray(value))
    return value.map((item) => sanitizeErrorContext(item, seen));
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      isSensitive(key) ? '[Filtered]' : sanitizeErrorContext(item, seen),
    ]),
  );
}

export function isUnexpectedError(error: AppError): boolean {
  return error.code === 'UNKNOWN_ERROR' || error.code === 'SERVER_ERROR';
}

export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const normalized = normalizeError(error);
  if (!isUnexpectedError(normalized)) return;
  const safeContext = sanitizeErrorContext({
    ...context,
    errorCode: normalized.code,
    businessCode: normalized.businessCode,
    requestId: normalized.requestId,
  }) as Record<string, unknown>;

  if (__DEV__) {
    console.error('[PhotoMatch]', normalized, safeContext);
    return;
  }
  if (!env.EXPO_PUBLIC_SENTRY_DSN) return;
  Sentry.captureException(normalized.cause ?? normalized, {
    extra: safeContext,
  });
}

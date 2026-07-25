import * as Crypto from 'expo-crypto';

import { env } from '@/config/env';
import { client } from '@/generated/api/client.gen';
import { accessTokenMemory } from '@/services/api/access-token';

import { normalizeError } from '../errors';
import { refreshAccessToken } from './auth-refresh';

const TIMEOUT_MS = 15_000;
const SKIP_REFRESH = 'x-photomatch-skip-refresh';
const RETRIED_AFTER_REFRESH = 'x-photomatch-auth-retried';

function canHaveJsonBody(method: string, body: BodyInit | null): boolean {
  return method !== 'GET' && method !== 'HEAD' && body !== null;
}

function shouldSkipRefresh(request: Request): boolean {
  if (request.headers.has(SKIP_REFRESH)) return true;
  try {
    const path = new URL(request.url).pathname;
    return [
      '/api/v1/auth/sign-in',
      '/api/v1/auth/oauth',
      '/api/v1/auth/refresh',
    ].some((endpoint) => path.endsWith(endpoint));
  } catch {
    return false;
  }
}

function withStandardHeaders(
  request: Request,
  requestId: string,
  accessToken = accessTokenMemory.get(),
): Request {
  const headers = new Headers(request.headers);
  headers.set('accept', 'application/json');
  headers.set('x-request-id', requestId);
  if (
    canHaveJsonBody(request.method, request.body) &&
    !headers.has('content-type')
  ) {
    headers.set('content-type', 'application/json');
  }
  if (accessToken && !headers.has('authorization')) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }
  return new Request(request, { headers });
}

export async function fetchWithAuthRefresh(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const original = input instanceof Request ? input : new Request(input, init);
  const requestId = original.headers.get('x-request-id') ?? Crypto.randomUUID();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  original.signal.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const firstResponse = await fetch(
      new Request(withStandardHeaders(original, requestId), {
        signal: controller.signal,
      }),
    );
    if (
      firstResponse.status !== 401 ||
      shouldSkipRefresh(original) ||
      original.headers.has(RETRIED_AFTER_REFRESH)
    ) {
      return firstResponse;
    }

    const refreshedToken = await refreshAccessToken();
    if (!refreshedToken) return firstResponse;

    const retryHeaders = new Headers(original.headers);
    retryHeaders.set(RETRIED_AFTER_REFRESH, '1');
    const retry = withStandardHeaders(
      new Request(original, { headers: retryHeaders }),
      requestId,
      refreshedToken,
    );
    return fetch(new Request(retry, { signal: controller.signal }));
  } catch (error) {
    throw normalizeError(error);
  } finally {
    clearTimeout(timeout);
    original.signal.removeEventListener('abort', abortFromCaller);
  }
}

export async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) return text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface ApiRequestOptions extends Omit<
  RequestInit,
  'body' | 'headers'
> {
  body?: unknown;
  headers?: HeadersInit;
  skipAuthRefresh?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    body: inputBody,
    headers: inputHeaders,
    skipAuthRefresh,
    ...requestInit
  } = options;
  const headers = new Headers(inputHeaders);
  if (skipAuthRefresh) headers.set(SKIP_REFRESH, '1');
  if (inputBody !== undefined && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const body = inputBody === undefined ? undefined : JSON.stringify(inputBody);
  const response = await fetchWithAuthRefresh(
    `${env.EXPO_PUBLIC_API_URL.replace(/\/$/, '')}${path}`,
    { ...requestInit, headers, body },
  );
  const payload = await parseResponseBody(response);
  if (!response.ok) throw normalizeError(payload, response);
  return payload as T;
}

client.setConfig({
  baseUrl: env.EXPO_PUBLIC_API_URL.replace(/\/$/, ''),
  fetch: fetchWithAuthRefresh,
  responseStyle: 'fields',
});

export const apiClient = client;
export const refreshBypassHeader = { [SKIP_REFRESH]: '1' } as const;

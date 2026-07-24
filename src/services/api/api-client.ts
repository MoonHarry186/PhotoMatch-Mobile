import * as Crypto from 'expo-crypto';

import { env } from '@/config/env';
import { client } from '@/generated/api/client.gen';

import { accessTokenMemory } from './access-token';
import { coordinatedRefresh } from './refresh-coordinator';

const TIMEOUT_MS = 15_000;
const SKIP_REFRESH = 'x-photomatch-skip-refresh';

function withHeaders(request: Request, correlationId: string): Request {
  const headers = new Headers(request.headers);
  headers.set('x-request-id', correlationId);
  const token = accessTokenMemory.get();
  if (token && !headers.has('authorization'))
    headers.set('authorization', `Bearer ${token}`);
  return new Request(request, { headers });
}

async function fetchWithSession(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = input instanceof Request ? input : new Request(input, init);
  const correlationId =
    request.headers.get('x-request-id') ?? Crypto.randomUUID();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const callerSignal = request.signal;
  const abortFromCaller = () => controller.abort();
  callerSignal.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(
      new Request(withHeaders(request, correlationId), {
        signal: controller.signal,
      }),
    );
    if (response.status !== 401 || request.headers.has(SKIP_REFRESH))
      return response;
    const refreshedToken = await coordinatedRefresh();
    if (!refreshedToken) return response;
    const retryHeaders = new Headers(request.headers);
    retryHeaders.set('authorization', `Bearer ${refreshedToken}`);
    retryHeaders.set('x-request-id', correlationId);
    return fetch(
      new Request(request, {
        headers: retryHeaders,
        signal: controller.signal,
      }),
    );
  } finally {
    clearTimeout(timer);
    callerSignal.removeEventListener('abort', abortFromCaller);
  }
}

client.setConfig({
  baseUrl: env.EXPO_PUBLIC_API_URL.replace(/\/$/, ''),
  fetch: fetchWithSession,
  responseStyle: 'fields',
});

export const apiClient = client;
export const refreshBypassHeader = { [SKIP_REFRESH]: '1' } as const;

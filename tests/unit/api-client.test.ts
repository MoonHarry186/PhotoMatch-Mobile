import { apiRequest, fetchWithAuthRefresh } from '@/core/api/api-client';
import {
  registerRefreshAction,
  refreshAccessToken,
} from '@/core/api/auth-refresh';
import { AppError } from '@/core/errors';
import { accessTokenMemory } from '@/services/api/access-token';

describe('core API client', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    accessTokenMemory.clear();
    registerRefreshAction(null);
  });

  it('parses JSON, empty and text success responses', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response('accepted', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        }),
      );

    await expect(apiRequest('/json')).resolves.toEqual({ ok: true });
    await expect(apiRequest('/empty')).resolves.toBeUndefined();
    await expect(apiRequest('/text')).resolves.toBe('accepted');
  });

  it('normalizes HTTP errors and preserves request IDs', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'BOOKING_TIME_UNAVAILABLE',
          message: 'raw backend message',
        }),
        {
          status: 409,
          headers: {
            'content-type': 'application/json',
            'x-request-id': 'req-api',
          },
        },
      ),
    );
    await expect(apiRequest('/booking')).rejects.toMatchObject({
      code: 'CONFLICT',
      businessCode: 'BOOKING_TIME_UNAVAILABLE',
      requestId: 'req-api',
    });
  });

  it('maps text server failures without exposing the raw response', async () => {
    fetchMock.mockResolvedValue(
      new Response('postgresql://internal/database failed', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      }),
    );
    await expect(apiRequest('/health')).rejects.toMatchObject({
      code: 'SERVER_ERROR',
      retryable: true,
    });
  });

  it('adds standard JSON and access-token headers', async () => {
    accessTokenMemory.set('access-token');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await apiRequest('/profile', {
      method: 'POST',
      body: { displayName: 'Linh' },
    });
    const request = fetchMock.mock.calls[0]?.[0] as Request;
    expect(request.headers.get('accept')).toBe('application/json');
    expect(request.headers.get('content-type')).toBe('application/json');
    expect(request.headers.get('authorization')).toBe('Bearer access-token');
  });

  it('coordinates concurrent 401 refresh and retries each request once', async () => {
    const refresh = jest.fn(async () => 'fresh-access-token');
    registerRefreshAction(refresh);
    fetchMock.mockImplementation(async (request: Request) => {
      return request.headers.get('authorization') ===
        'Bearer fresh-access-token'
        ? new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        : new Response('', { status: 401 });
    });

    await expect(
      Promise.all([apiRequest('/one'), apiRequest('/two')]),
    ).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not recurse on refresh endpoints or retry more than once', async () => {
    const refresh = jest.fn(async () => 'still-invalid');
    registerRefreshAction(refresh);
    fetchMock.mockResolvedValue(new Response('', { status: 401 }));

    await expect(
      apiRequest('/api/v1/auth/refresh', {
        method: 'POST',
        body: { refreshToken: 'redacted' },
        skipAuthRefresh: true,
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    await fetchWithAuthRefresh('http://localhost/protected');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shares one direct refresh promise', async () => {
    const refresh = jest.fn(async () => 'token');
    registerRefreshAction(refresh);
    await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      refreshAccessToken(),
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

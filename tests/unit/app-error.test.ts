import {
  AppError,
  applyServerFieldErrors,
  getUserErrorMessage,
  normalizeError,
  sanitizeErrorContext,
} from '@/core/errors';

describe('AppError', () => {
  it('keeps typed metadata and defaults retryable to false', () => {
    const cause = new Error('internal');
    const error = new AppError({
      code: 'CONFLICT',
      message: 'Conflict',
      businessCode: 'BOOKING_TIME_UNAVAILABLE',
      details: { resourceId: 'booking-1' },
      requestId: 'req-1',
      cause,
    });
    expect(error).toMatchObject({
      code: 'CONFLICT',
      retryable: false,
      businessCode: 'BOOKING_TIME_UNAVAILABLE',
      details: { resourceId: 'booking-1' },
      requestId: 'req-1',
      cause,
    });
  });

  it('keeps AppError instances and normalizes network and unknown failures', () => {
    const appError = new AppError({
      code: 'NOT_FOUND',
      message: 'Missing',
    });
    expect(normalizeError(appError)).toBe(appError);
    expect(normalizeError(new TypeError('Failed to fetch'))).toMatchObject({
      code: 'NETWORK_ERROR',
      retryable: true,
    });
    expect(normalizeError('bad value')).toMatchObject({
      code: 'UNKNOWN_ERROR',
      retryable: false,
      cause: 'bad value',
    });
  });

  it.each([
    [401, 'UNAUTHORIZED'],
    [403, 'FORBIDDEN'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [422, 'VALIDATION_ERROR'],
    [429, 'RATE_LIMITED'],
    [500, 'SERVER_ERROR'],
  ] as const)('maps HTTP %s to %s', (status, code) => {
    const response = new Response('', {
      status,
      headers: { 'x-request-id': 'req-http' },
    });
    expect(
      normalizeError({ code: 'BACKEND_CODE', message: 'raw' }, response),
    ).toMatchObject({
      code,
      businessCode: 'BACKEND_CODE',
      requestId: 'req-http',
    });
  });

  it('maps backend validation messages into their fields', () => {
    const error = normalizeError(
      {
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: {
          fieldErrors: {
            phoneNumber: ['Số điện thoại không hợp lệ'],
          },
        },
      },
      new Response('', { status: 422 }),
    );
    const setter = jest.fn();
    applyServerFieldErrors(error.fieldErrors, setter);
    expect(setter).toHaveBeenCalledWith(
      'phoneNumber',
      'Số điện thoại không hợp lệ',
    );
  });

  it('keeps backend details for business-specific error handling', () => {
    const details = {
      accountStatus: 'SUSPENDED',
      restrictions: [{ reason: 'Vi phạm quy định' }],
    };
    expect(
      normalizeError(
        {
          code: 'ACCOUNT_RESTRICTED',
          message: 'Account is not active',
          details,
        },
        new Response('', { status: 403 }),
      ),
    ).toMatchObject({
      code: 'FORBIDDEN',
      businessCode: 'ACCOUNT_RESTRICTED',
      details,
    });
  });

  it('uses only safe Vietnamese copy and sanitizes sensitive context', () => {
    const error = new AppError({
      code: 'SERVER_ERROR',
      message: 'Prisma failed at postgresql://internal',
    });
    expect(getUserErrorMessage(error)).toBe(
      'Hệ thống đang gặp sự cố. Vui lòng thử lại.',
    );
    expect(
      sanitizeErrorContext({
        accessToken: 'secret',
        nested: { password: 'secret', route: '/profile' },
      }),
    ).toEqual({
      accessToken: '[Filtered]',
      nested: { password: '[Filtered]', route: '/profile' },
    });
  });
});

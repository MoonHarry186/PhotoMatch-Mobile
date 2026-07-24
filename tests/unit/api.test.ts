import { ApiError, fieldErrors, toApiError } from '@/services/api/api-error';
import { createSubmissionKey } from '@/services/api/idempotency';
import {
  coordinatedRefresh,
  registerRefreshAction,
} from '@/services/api/refresh-coordinator';

describe('shared API behavior', () => {
  it('normalizes server and field errors', () => {
    const error = toApiError({
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
      requestId: 'request-1',
      details: { fields: { email: 'Already used' } },
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(fieldErrors(error)).toEqual({ email: 'Already used' });
  });

  it('keeps one idempotency key until canonical completion', () => {
    const key = createSubmissionKey();
    expect(key.current()).toBe(key.current());
    const first = key.current();
    key.complete();
    expect(key.current()).toBe(first);
  });

  it('coordinates a refresh storm', async () => {
    const action = jest.fn(async () => 'access-token');
    registerRefreshAction(action);
    await Promise.all([
      coordinatedRefresh(),
      coordinatedRefresh(),
      coordinatedRefresh(),
    ]);
    expect(action).toHaveBeenCalledTimes(1);
    registerRefreshAction(null);
  });
});

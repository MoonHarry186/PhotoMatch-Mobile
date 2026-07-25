import { AppError } from '@/core/errors';
import {
  createPhotoMatchQueryClient,
  shouldRetry,
} from '@/providers/query-provider';

describe('TanStack Query error policy', () => {
  it('retries only network/server queries at most twice', () => {
    const network = new AppError({
      code: 'NETWORK_ERROR',
      message: 'Offline',
    });
    const validation = new AppError({
      code: 'VALIDATION_ERROR',
      message: 'Invalid',
    });
    expect(shouldRetry(0, network)).toBe(true);
    expect(shouldRetry(1, network)).toBe(true);
    expect(shouldRetry(2, network)).toBe(false);
    expect(shouldRetry(0, validation)).toBe(false);
  });

  it('does not retry mutations or discard cache after refetch failure', async () => {
    const client = createPhotoMatchQueryClient();
    const key = ['cached'];
    client.setQueryData(key, { value: 'old' });
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
    await expect(
      client.fetchQuery({
        queryKey: key,
        staleTime: 0,
        queryFn: async () => {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'Invalid',
          });
        },
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(client.getQueryData(key)).toEqual({ value: 'old' });
    client.clear();
  });
});

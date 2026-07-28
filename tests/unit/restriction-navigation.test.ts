import { AppError, normalizeError } from '@/core/errors';
import {
  restrictionParamsFromError,
  restrictionRoute,
} from '@/features/auth/restriction-navigation';

describe('restricted account navigation', () => {
  it('extracts the account status and active penalty from the API error', () => {
    const error = normalizeError(
      {
        code: 'ACCOUNT_RESTRICTED',
        message: 'Account is not active',
        details: {
          accountStatus: 'SUSPENDED',
          restrictions: [
            {
              penaltyType: 'TEMPORARY_SUSPENSION',
              reason: 'Vi phạm quy định cộng đồng',
              endsAt: '2026-08-01T12:00:00.000Z',
            },
          ],
        },
      },
      new Response('', { status: 403 }),
    );

    expect(restrictionParamsFromError(error)).toEqual({
      accountStatus: 'SUSPENDED',
      penaltyType: 'TEMPORARY_SUSPENSION',
      reason: 'Vi phạm quy định cộng đồng',
      endsAt: '2026-08-01T12:00:00.000Z',
    });
  });

  it('still routes direct admin suspensions that have no penalty record', () => {
    const error = new AppError({
      code: 'FORBIDDEN',
      message: 'Account is not active',
      businessCode: 'ACCOUNT_RESTRICTED',
      details: { accountStatus: 'BANNED', restrictions: [] },
    });
    const params = restrictionParamsFromError(error);

    expect(params).toStrictEqual({ accountStatus: 'BANNED' });
    expect(restrictionRoute(params!)).toStrictEqual({
      pathname: '/(public)/restriction',
      params: { accountStatus: 'BANNED' },
    });
  });

  it('does not redirect unrelated forbidden errors', () => {
    const error = new AppError({
      code: 'FORBIDDEN',
      message: 'Forbidden',
      businessCode: 'ADMIN_ROLE_REQUIRED',
    });
    expect(restrictionParamsFromError(error)).toBeNull();
  });
});

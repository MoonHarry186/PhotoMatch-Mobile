import {
  isOAuthCancellation,
  oauthResponseOutcome,
} from '@/features/auth/oauth-response';

describe('OAuth response handling', () => {
  it('treats user cancellation as neutral', () => {
    expect(oauthResponseOutcome({ type: 'cancel' })).toEqual({
      kind: 'cancel',
    });
    const error = Object.assign(new Error('cancelled'), {
      code: 'ERR_REQUEST_CANCELED',
    });
    expect(isOAuthCancellation(error)).toBe(true);
  });

  it('rejects provider failures and missing assertions', () => {
    expect(oauthResponseOutcome({ type: 'error' })).toEqual({
      kind: 'failure',
    });
    expect(oauthResponseOutcome({ type: 'success', params: {} })).toEqual({
      kind: 'failure',
    });
  });

  it('returns only the backend assertion', () => {
    expect(
      oauthResponseOutcome({
        type: 'success',
        authentication: { idToken: 'identity-token' },
      }),
    ).toEqual({ kind: 'success', idToken: 'identity-token' });
  });
});

import { resolveGate, type BootstrapSnapshot } from '@/providers/bootstrap';
import { isTerminalSessionError } from '@/providers/session-policy';
import { ApiError } from '@/services/api/api-error';

const snapshot = {
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    accountStatus: 'ACTIVE',
    emailVerified: true,
    roles: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  restrictions: [],
  currentLegal: [],
  consents: [],
  onboarding: {
    userRoleId: null,
    role: 'CUSTOMER',
    complete: true,
    missing: [],
    discoveryEligible: true,
    discoveryReasons: [],
  },
} satisfies BootstrapSnapshot;

describe('resolveGate', () => {
  it('applies priority without flashing private routes', () => {
    expect(resolveGate(null)).toBe('signed-out');
    expect(
      resolveGate({
        ...snapshot,
        user: { ...snapshot.user, emailVerified: false },
      }),
    ).toBe('verification');
    expect(
      resolveGate({
        ...snapshot,
        restrictions: [
          {
            id: snapshot.user.id,
            userId: snapshot.user.id,
            penaltyType: 'PERMANENT_BAN',
            reason: 'Policy',
            status: 'ACTIVE',
            startsAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ).toBe('restriction');
    expect(
      resolveGate({
        ...snapshot,
        currentLegal: [
          {
            id: snapshot.user.id,
            documentType: 'TERMS_OF_SERVICE',
            version: '2',
            contentUrl: 'https://example.com/terms',
            status: 'ACTIVE',
            effectiveAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    ).toBe('legal');
    expect(
      resolveGate({
        ...snapshot,
        onboarding: { ...snapshot.onboarding, complete: false },
      }),
    ).toBe('onboarding');
    expect(resolveGate(snapshot)).toBe('app');
  });

  it('keeps offline credentials but ends revoked sessions', () => {
    expect(
      isTerminalSessionError(
        new ApiError({ code: 'NETWORK_ERROR', message: 'Offline' }),
      ),
    ).toBe(false);
    expect(
      isTerminalSessionError(
        new ApiError({
          code: 'UNAUTHORIZED',
          message: 'Revoked',
          status: 401,
          businessCode: 'REFRESH_TOKEN_REUSED',
        }),
      ),
    ).toBe(true);
  });
});

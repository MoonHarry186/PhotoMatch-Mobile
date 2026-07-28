import { portfolioEligibility } from '@/features/profile/profile.types';
import { queryKeys } from '@/services/api/query-keys';

describe('public profile and portfolio rules', () => {
  it('keeps public and private caches separated by purpose and role', () => {
    const privateKey = queryKeys.portfolio({
      userId: 'user-1',
      roleId: 'role-1',
    });
    const publicKey = queryKeys.publicPortfolio('role-1');
    expect(privateKey[0]).toBe('private');
    expect(publicKey[0]).toBe('public');
    expect(privateKey).not.toEqual(publicKey);
  });

  it('refreshes eligibility at the six-image threshold', () => {
    expect(portfolioEligibility(5)).toMatchObject({
      eligible: false,
      count: 5,
      required: 6,
    });
    expect(portfolioEligibility(6)).toMatchObject({ eligible: true, count: 6 });
    expect(portfolioEligibility(7).message).toContain('tối thiểu 6 ảnh');
  });

  it('uses stable keys for paginated public pages', () => {
    expect(queryKeys.publicPortfolio('role-1')).toEqual(
      queryKeys.publicPortfolio('role-1'),
    );
    expect(queryKeys.publicPortfolio('role-1', 'next')).not.toEqual(
      queryKeys.publicPortfolio('role-1'),
    );
    expect(queryKeys.publicReviews('role-1', 'next')).not.toEqual(
      queryKeys.publicReviews('role-1'),
    );
  });
});

import {
  canChooseAdditionalRole,
  firstIncompleteStep,
  invalidCatalogSelection,
  portfolioWarning,
} from '@/features/onboarding/onboarding.model';
import {
  personalProfileSchema,
  servicesSchema,
} from '@/features/onboarding/onboarding.schemas';
import { queryKeys } from '@/services/api/query-keys';

const customerRole = {
  id: '11111111-1111-4111-8111-111111111111',
  code: 'CUSTOMER',
  name: 'Customer',
  status: 'ACTIVE',
} as const;
const photographerRole = {
  id: '22222222-2222-4222-8222-222222222222',
  code: 'PHOTOGRAPHER',
  name: 'Photographer',
  status: 'ACTIVE',
} as const;

describe('onboarding progress and validation', () => {
  it('resumes at the first server-reported incomplete step', () => {
    expect(
      firstIncompleteStep({
        complete: false,
        missing: ['services', 'avatar', 'portfolioImages'],
      }),
    ).toBe('avatar');
    expect(
      firstIncompleteStep({
        complete: false,
        missing: ['dateOfBirth', 'city'],
      }),
    ).toBe('personal');
    expect(firstIncompleteStep({ complete: true, missing: [] })).toBe(
      'summary',
    );
  });

  it('rejects stale or role-incompatible catalog selections locally', () => {
    expect(
      invalidCatalogSelection(['allowed-id', 'inactive-id'], ['allowed-id']),
    ).toEqual(['inactive-id']);
  });

  it('validates offered-service pricing and personal age', () => {
    expect(
      servicesSchema.safeParse({
        services: [
          {
            serviceId: '33333333-3333-4333-8333-333333333333',
            serviceMode: 'OFFERED',
            minPrice: 2_000_000,
            maxPrice: 1_000_000,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      servicesSchema.safeParse({
        services: [
          {
            serviceId: '33333333-3333-4333-8333-333333333333',
            serviceMode: 'OFFERED',
            minPrice: 1_000_000,
            maxPrice: 2_000_000,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      personalProfileSchema.safeParse({
        displayName: 'Bạn trẻ',
        dateOfBirth: new Date().toISOString().slice(0, 10),
        cityId: '44444444-4444-4444-8444-444444444444',
        bio: '',
      }).success,
    ).toBe(false);
  });

  it('prevents replacing the additional role after selection or completion', () => {
    expect(canChooseAdditionalRole([customerRole], null)).toBe(true);
    expect(
      canChooseAdditionalRole([customerRole, photographerRole], null),
    ).toBe(false);
    expect(
      canChooseAdditionalRole([customerRole], '2026-07-27T00:00:00.000Z'),
    ).toBe(false);
  });

  it('isolates private query caches by current role', () => {
    const customer = queryKeys.selfProfile({
      userId: 'user-1',
      roleId: customerRole.id,
    });
    const photographer = queryKeys.selfProfile({
      userId: 'user-1',
      roleId: photographerRole.id,
    });
    expect(customer).not.toEqual(photographer);
    expect(customer[2]).toBe(customerRole.id);
    expect(photographer[2]).toBe(photographerRole.id);
  });

  it('keeps an incomplete photographer non-discoverable below six images', () => {
    expect(portfolioWarning('PHOTOGRAPHER', 5)).toContain('5/6');
    expect(portfolioWarning('PHOTOGRAPHER', 6)).toBeNull();
    expect(portfolioWarning('CUSTOMER', 0)).toBeNull();
    expect(
      firstIncompleteStep({
        complete: false,
        missing: ['portfolioImages'],
      }),
    ).toBe('portfolio');
  });
});

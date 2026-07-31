import {
  DISCOVERY_IMAGE_PRELOAD_LIMIT,
  defaultDiscoveryFilters,
  discoveryFiltersSchema,
  LEFT_COOLDOWN_DAYS,
  locationPermissionMessage,
  reconcileMatches,
  relationshipErrorMessage,
  REMATCH_COOLDOWN_DAYS,
  roleDiscoveryActions,
  toDiscoveryCandidate,
} from '@/features/discovery/discovery.types';
import {
  discoveryStorageKey,
  toDiscoveryPersistedState,
} from '@/features/discovery/discovery.store';
import { queryKeys } from '@/services/api/query-keys';

describe('Discovery relationship rules', () => {
  it('keeps documented cooldown presentation aligned with backend policy', () => {
    expect(DISCOVERY_IMAGE_PRELOAD_LIMIT).toBe(2);
    expect(LEFT_COOLDOWN_DAYS).toBe(7);
    expect(REMATCH_COOLDOWN_DAYS).toBe(30);
    expect(
      relationshipErrorMessage({ businessCode: 'REMATCH_COOLDOWN' }),
    ).toContain('30 ngày');
  });

  it('allows proactive discovery actions only for Customer', () => {
    expect(roleDiscoveryActions('CUSTOMER')).toEqual({
      canBrowseCandidates: true,
      canSwipeLeft: true,
      canSwipeRight: true,
      canDecideIncoming: false,
    });
    expect(roleDiscoveryActions('PHOTOGRAPHER')).toEqual({
      canBrowseCandidates: false,
      canSwipeLeft: false,
      canSwipeRight: false,
      canDecideIncoming: true,
    });
    expect(
      relationshipErrorMessage({ businessCode: 'FEATURE_NOT_AVAILABLE' }),
    ).toContain('chưa thể chủ động');
  });

  it('validates filters and persists only a versioned allowlist', () => {
    expect(discoveryFiltersSchema.parse({})).toEqual(defaultDiscoveryFilters);
    expect(
      discoveryFiltersSchema.safeParse({
        ...defaultDiscoveryFilters,
        minPrice: 2_000_000,
        maxPrice: 1_000_000,
      }).success,
    ).toBe(false);
    const persisted = toDiscoveryPersistedState({
      filters: { ...defaultDiscoveryFilters, radiusKm: 50 },
      setFilters: jest.fn(),
      resetFilters: jest.fn(),
      latitude: 10.77,
      rawCandidatePage: { private: true },
    } as Parameters<typeof toDiscoveryPersistedState>[0] &
      Record<string, unknown>);
    expect(discoveryStorageKey).toBe('photomatch.discovery.filters.v2');
    expect(persisted).toEqual({
      filters: { ...defaultDiscoveryFilters, radiusKm: 50 },
    });
    expect(JSON.stringify(persisted)).not.toMatch(/latitude|candidate/i);
  });

  it('projects candidate fields without coordinates or a fabricated match', () => {
    const candidate = toDiscoveryCandidate({
      userRoleId: 'role-1',
      displayName: 'An',
      headline: 'Ảnh cưới',
      distance: '3-5 km',
      identityVerificationStatus: 'VERIFIED',
      latitude: 10.77,
      longitude: 106.69,
      matchId: 'must-not-leak',
    } as Parameters<typeof toDiscoveryCandidate>[0] & Record<string, unknown>);
    expect(candidate).toEqual({
      userRoleId: 'role-1',
      displayName: 'An',
      avatarAssetId: null,
      headline: 'Ảnh cưới',
      availabilityStatus: null,
      verified: true,
      distance: '3-5 km',
    });
    expect(JSON.stringify(candidate)).not.toMatch(
      /latitude|longitude|matchId/i,
    );
  });

  it('keeps distance optional outside the opt-in nearby filter', () => {
    const candidate = toDiscoveryCandidate({
      userRoleId: 'role-global',
      displayName: 'Bình',
      distance: null,
      identityVerificationStatus: 'NOT_SUBMITTED',
    });
    expect(candidate.distance).toBeNull();
    expect(defaultDiscoveryFilters.nearbyOnly).toBe(false);
  });

  it('maps opt-in nearby permission failures to actionable copy', () => {
    expect(locationPermissionMessage('denied')).toContain('cấp quyền');
    expect(locationPermissionMessage('restricted')).toContain('Cài đặt');
    expect(locationPermissionMessage('services-disabled')).toContain(
      'đang tắt',
    );
  });

  it('deduplicates a REST result and accept-event race by match id', () => {
    const original = {
      id: 'match-1',
      status: 'ACTIVE' as const,
      matchedAt: '2026-07-30T00:00:00.000Z',
      counterpart: {
        userRoleId: 'role-1',
        role: 'PHOTOGRAPHER' as const,
        displayName: 'An',
      },
    };
    const fromEvent = {
      ...original,
      conversation: { id: 'conversation-1', status: 'ACTIVE' as const },
    };
    expect(reconcileMatches([original], [fromEvent])).toEqual([fromEvent]);
  });

  it('isolates candidate, interest and match cache by role', () => {
    const customer = { userId: 'user-1', roleId: 'customer-role' };
    const photographer = {
      userId: 'user-1',
      roleId: 'photographer-role',
    };
    expect(queryKeys.discovery(customer, defaultDiscoveryFilters)).not.toEqual(
      queryKeys.discovery(photographer, defaultDiscoveryFilters),
    );
    expect(queryKeys.interests(customer)).not.toEqual(
      queryKeys.interests(photographer),
    );
    expect(queryKeys.matches(customer)).not.toEqual(
      queryKeys.matches(photographer),
    );
  });
});

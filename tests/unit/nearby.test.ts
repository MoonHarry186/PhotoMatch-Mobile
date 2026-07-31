import * as Location from 'expo-location';

import {
  resolveLocationPermission,
  type LocationPermissionState,
} from '@/features/nearby/location-permission';
import {
  defaultNearbyFilters,
  nearbyFiltersSchema,
  presencePresentation,
  toNearbyCandidate,
} from '@/features/nearby/nearby.types';
import {
  nearbyStorageKey,
  toNearbyPersistedState,
} from '@/features/nearby/nearby.store';
import { queryKeys } from '@/services/api/query-keys';

describe('Nearby privacy and state rules', () => {
  it.each([
    [false, Location.PermissionStatus.GRANTED, true, 'services-disabled'],
    [true, Location.PermissionStatus.GRANTED, true, 'granted'],
    [true, Location.PermissionStatus.UNDETERMINED, true, 'undetermined'],
    [true, Location.PermissionStatus.DENIED, true, 'denied'],
    [true, Location.PermissionStatus.DENIED, false, 'restricted'],
  ] as const)(
    'resolves services=%s status=%s askAgain=%s as %s',
    (servicesEnabled, status, canAskAgain, expected) => {
      expect(
        resolveLocationPermission({
          servicesEnabled,
          status,
          canAskAgain,
        }),
      ).toBe(expected satisfies LocationPermissionState);
    },
  );

  it('distinguishes disabled, visible and expired presence', () => {
    expect(presencePresentation(undefined, 1_000)).toBe('disabled');
    expect(
      presencePresentation(
        {
          userRoleId: 'role-1',
          isVisible: true,
          visibleUntil: new Date(2_000).toISOString(),
        },
        1_000,
      ),
    ).toBe('visible');
    expect(
      presencePresentation(
        {
          userRoleId: 'role-1',
          isVisible: true,
          visibleUntil: new Date(1_000).toISOString(),
        },
        1_000,
      ),
    ).toBe('expired');
  });

  it('validates filter bounds and rejects an inverted price range', () => {
    expect(nearbyFiltersSchema.parse({})).toEqual(defaultNearbyFilters);
    expect(
      nearbyFiltersSchema.safeParse({
        ...defaultNearbyFilters,
        minPrice: 2_000_000,
        maxPrice: 1_000_000,
      }).success,
    ).toBe(false);
    expect(
      nearbyFiltersSchema.safeParse({
        ...defaultNearbyFilters,
        radiusKm: 101,
      }).success,
    ).toBe(false);
  });

  it('projects candidates to the public allowlist without coordinates', () => {
    const candidate = toNearbyCandidate({
      userRoleId: 'role-2',
      displayName: 'An',
      avatarAssetId: null,
      headline: 'Chụp ảnh cưới',
      availabilityStatus: 'AVAILABLE',
      identityVerificationStatus: 'VERIFIED',
      distance: 'Cách khoảng 3 km',
      latitude: 10.77,
      longitude: 106.69,
      publicCoordinate: { latitude: 10.7, longitude: 106.6 },
    } as Parameters<typeof toNearbyCandidate>[0] & Record<string, unknown>);

    expect(candidate).toEqual({
      userRoleId: 'role-2',
      displayName: 'An',
      avatarAssetId: null,
      headline: 'Chụp ảnh cưới',
      availabilityStatus: 'AVAILABLE',
      verified: true,
      distance: 'Cách khoảng 3 km',
    });
    expect(JSON.stringify(candidate)).not.toMatch(
      /latitude|longitude|coordinate/i,
    );
  });

  it('persists only versioned filters and excludes location data', () => {
    const persisted = toNearbyPersistedState({
      filters: {
        ...defaultNearbyFilters,
        radiusKm: 30,
      },
      setFilters: jest.fn(),
      resetFilters: jest.fn(),
      latitude: 10.77,
      longitude: 106.69,
    } as Parameters<typeof toNearbyPersistedState>[0] &
      Record<string, unknown>);

    expect(nearbyStorageKey).toBe('photomatch.nearby.filters.v1');
    expect(persisted).toEqual({
      filters: { ...defaultNearbyFilters, radiusKm: 30 },
    });
    expect(JSON.stringify(persisted)).not.toMatch(/latitude|longitude/i);
  });

  it('isolates Nearby cache by account, role and filters', () => {
    const customerKey = queryKeys.nearby(
      { userId: 'user-1', roleId: 'customer-role' },
      { targetRole: 'PHOTOGRAPHER', ...defaultNearbyFilters },
    );
    const photographerKey = queryKeys.nearby(
      { userId: 'user-1', roleId: 'photographer-role' },
      { targetRole: 'CUSTOMER', ...defaultNearbyFilters },
    );
    const widerRadiusKey = queryKeys.nearby(
      { userId: 'user-1', roleId: 'customer-role' },
      {
        targetRole: 'PHOTOGRAPHER',
        ...defaultNearbyFilters,
        radiusKm: 50,
      },
    );

    expect(customerKey).not.toEqual(photographerKey);
    expect(customerKey).not.toEqual(widerRadiusKey);
  });
});

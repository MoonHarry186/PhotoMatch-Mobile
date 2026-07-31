jest.mock('@/generated/api/sdk.gen', () => ({
  catalogControllerServices: jest.fn(),
  discoveryControllerDeleteLocation: jest.fn(),
  discoveryControllerNearby: jest.fn(),
  discoveryControllerPresence: jest.fn(),
  discoveryControllerPutLocation: jest.fn(),
  discoveryControllerPutPresence: jest.fn(),
}));

import {
  discoveryControllerDeleteLocation,
  discoveryControllerNearby,
  discoveryControllerPutLocation,
  discoveryControllerPutPresence,
} from '@/generated/api/sdk.gen';
import { nearbyApi } from '@/features/nearby/nearby.api';
import { defaultNearbyFilters } from '@/features/nearby/nearby.types';

describe('Nearby API adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends every server-side filter before pagination and strips coordinates', async () => {
    const signal = new AbortController().signal;
    (discoveryControllerNearby as jest.Mock).mockResolvedValue({
      data: {
        items: [
          {
            userRoleId: 'role-2',
            displayName: 'An',
            distance: 'Cách khoảng 3 km',
            latitude: 10.77,
            longitude: 106.69,
          },
        ],
        nextCursor: 'next-page',
      },
    });

    const result = await nearbyApi.list(
      'PHOTOGRAPHER',
      {
        ...defaultNearbyFilters,
        serviceIds: ['94f1a21d-c353-4e88-bb35-02a90e824437'],
        minPrice: 500_000,
        maxPrice: 2_000_000,
        radiusKm: 30,
        availableOnly: true,
        verifiedOnly: true,
      },
      'cursor-1',
      signal,
    );

    expect(discoveryControllerNearby).toHaveBeenCalledWith({
      query: {
        targetRole: 'PHOTOGRAPHER',
        cursor: 'cursor-1',
        limit: 20,
        radiusKm: 30,
        serviceIds: ['94f1a21d-c353-4e88-bb35-02a90e824437'],
        minPrice: 500_000,
        maxPrice: 2_000_000,
        availableOnly: true,
        verifiedOnly: true,
      },
      signal,
    });
    expect(result.nextCursor).toBe('next-page');
    expect(JSON.stringify(result.items)).not.toMatch(/latitude|longitude/i);
  });

  it('uses owner-only endpoints for updating and clearing exact location', async () => {
    const location = {
      latitude: 10.77,
      longitude: 106.69,
      accuracyMeters: 20,
      capturedAt: '2026-07-30T00:00:00.000Z',
    };
    (discoveryControllerPutLocation as jest.Mock).mockResolvedValue({
      data: { status: 'updated' },
    });
    (discoveryControllerDeleteLocation as jest.Mock).mockResolvedValue({
      data: { status: 'deleted', discoveryPresenceEnabled: false },
    });

    await expect(nearbyApi.updateExactLocation(location)).resolves.toEqual({
      status: 'updated',
    });
    await expect(nearbyApi.clearExactLocation()).resolves.toEqual({
      status: 'deleted',
      discoveryPresenceEnabled: false,
    });
    expect(discoveryControllerPutLocation).toHaveBeenCalledWith({
      body: location,
    });
    expect(discoveryControllerDeleteLocation).toHaveBeenCalledWith();
  });

  it('passes role ownership and visibility duration to presence updates', async () => {
    (discoveryControllerPutPresence as jest.Mock).mockResolvedValue({
      data: {
        userRoleId: 'role-1',
        isVisible: true,
        visibleUntil: '2026-07-31T00:00:00.000Z',
      },
    });

    await nearbyApi.updatePresence({
      userRoleId: 'role-1',
      enabled: true,
      visibilityHours: 24,
    });

    expect(discoveryControllerPutPresence).toHaveBeenCalledWith({
      body: {
        userRoleId: 'role-1',
        enabled: true,
        visibilityHours: 24,
      },
    });
  });
});

jest.mock('@/generated/api/sdk.gen', () => ({
  catalogControllerServices: jest.fn(),
  discoveryControllerCandidates: jest.fn(),
  discoveryControllerPutLocation: jest.fn(),
  relationshipsControllerDecide: jest.fn(),
  relationshipsControllerIncoming: jest.fn(),
  relationshipsControllerMatchDetail: jest.fn(),
  relationshipsControllerMatches: jest.fn(),
  relationshipsControllerSwipe: jest.fn(),
  relationshipsControllerUnmatch: jest.fn(),
  uploadsControllerAccessUrl: jest.fn(),
}));

import {
  discoveryControllerCandidates,
  discoveryControllerPutLocation,
  relationshipsControllerDecide,
  relationshipsControllerIncoming,
  relationshipsControllerSwipe,
  relationshipsControllerUnmatch,
} from '@/generated/api/sdk.gen';
import { discoveryApi } from '@/features/discovery/discovery.api';
import { defaultDiscoveryFilters } from '@/features/discovery/discovery.types';

describe('Discovery API adapter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends all filters to the server before cursor pagination', async () => {
    const signal = new AbortController().signal;
    (discoveryControllerCandidates as jest.Mock).mockResolvedValue({
      data: { items: [], nextCursor: 'next' },
    });
    await discoveryApi.candidates(
      {
        ...defaultDiscoveryFilters,
        serviceIds: ['94f1a21d-c353-4e88-bb35-02a90e824437'],
        minPrice: 500_000,
        maxPrice: 2_000_000,
        nearbyOnly: true,
        radiusKm: 30,
        availableOnly: true,
        verifiedOnly: true,
      },
      'cursor-1',
      signal,
    );
    expect(discoveryControllerCandidates).toHaveBeenCalledWith({
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
  });

  it('omits radius and location mode from the default Discovery request', async () => {
    (discoveryControllerCandidates as jest.Mock).mockResolvedValue({
      data: { items: [], nextCursor: null },
    });
    await discoveryApi.candidates(defaultDiscoveryFilters);
    expect(discoveryControllerCandidates).toHaveBeenCalledWith({
      query: {
        targetRole: 'PHOTOGRAPHER',
        cursor: undefined,
        limit: 20,
        availableOnly: false,
        verifiedOnly: false,
      },
      signal: undefined,
    });
  });

  it('updates owner location only through the dedicated endpoint', async () => {
    (discoveryControllerPutLocation as jest.Mock).mockResolvedValue({
      data: { status: 'updated' },
    });
    const location = {
      latitude: 21.0278,
      longitude: 105.8342,
      capturedAt: '2026-07-30T00:00:00.000Z',
    };
    await expect(discoveryApi.updateExactLocation(location)).resolves.toEqual({
      status: 'updated',
    });
    expect(discoveryControllerPutLocation).toHaveBeenCalledWith({
      body: location,
    });
  });

  it('submits Customer RIGHT as an interest without fabricating a match', async () => {
    (relationshipsControllerSwipe as jest.Mock).mockResolvedValue({
      data: {
        id: 'swipe-1',
        actorUserRoleId: 'customer-role',
        targetUserRoleId: 'photographer-role',
        direction: 'RIGHT',
        source: 'DISCOVERY',
        createdAt: '2026-07-30T00:00:00.000Z',
      },
    });
    const result = await discoveryApi.swipe({
      targetUserRoleId: 'photographer-role',
      direction: 'RIGHT',
      source: 'DISCOVERY',
    });
    expect(relationshipsControllerSwipe).toHaveBeenCalledTimes(1);
    expect(result.direction).toBe('RIGHT');
    expect(result).not.toHaveProperty('matchId');
  });

  it('maps incoming customer detail from the generated contract', async () => {
    (relationshipsControllerIncoming as jest.Mock).mockResolvedValue({
      data: {
        items: [
          {
            id: 'interest-1',
            createdAt: '2026-07-30T00:00:00.000Z',
            source: 'DISCOVERY',
            customer: {
              userRoleId: 'customer-role',
              displayName: 'Minh',
              city: 'Hà Nội',
              identityVerificationStatus: 'VERIFIED',
            },
          },
        ],
        nextCursor: null,
      },
    });
    await expect(discoveryApi.incoming()).resolves.toMatchObject({
      items: [
        {
          id: 'interest-1',
          customer: { displayName: 'Minh', verified: true },
        },
      ],
    });
  });

  it('uses stable command identities for decision and unmatch', async () => {
    (relationshipsControllerDecide as jest.Mock).mockResolvedValue({
      data: {
        interestId: 'interest-1',
        decision: 'ACCEPT',
        matchId: 'match-1',
        conversationId: 'conversation-1',
      },
    });
    (relationshipsControllerUnmatch as jest.Mock).mockResolvedValue({
      data: {
        id: 'match-1',
        status: 'ENDED',
        matchedAt: '2026-07-30T00:00:00.000Z',
        counterpart: {
          userRoleId: 'photographer-role',
          role: 'PHOTOGRAPHER',
        },
      },
    });

    await discoveryApi.decide('interest-1', 'ACCEPT', 'decision-key');
    await discoveryApi.unmatch('match-1', 'Không còn nhu cầu', 'unmatch-key');

    expect(relationshipsControllerDecide).toHaveBeenCalledWith({
      path: { interestId: 'interest-1' },
      headers: { 'Idempotency-Key': 'decision-key' },
      body: { decision: 'ACCEPT' },
    });
    expect(relationshipsControllerUnmatch).toHaveBeenCalledWith({
      path: { matchId: 'match-1' },
      headers: { 'Idempotency-Key': 'unmatch-key' },
      body: { reason: 'Không còn nhu cầu' },
    });
  });
});

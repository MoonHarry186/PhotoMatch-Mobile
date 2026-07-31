import {
  catalogControllerServices,
  discoveryControllerDeleteLocation,
  discoveryControllerNearby,
  discoveryControllerPresence,
  discoveryControllerPutLocation,
  discoveryControllerPutPresence,
} from '@/generated/api/sdk.gen';
import type {
  DiscoveryCandidatePage,
  PutLocationDto,
  PutPresenceDto,
} from '@/generated/api/types.gen';
import { unwrap } from '@/services/api/result';

import { toNearbyCandidate, type NearbyFilters } from './nearby.types';

export const nearbyApi = {
  async services() {
    return unwrap(await catalogControllerServices());
  },

  async list(
    targetRole: 'CUSTOMER' | 'PHOTOGRAPHER',
    filters: NearbyFilters,
    cursor?: string,
    signal?: AbortSignal,
  ) {
    const page: DiscoveryCandidatePage = unwrap(
      await discoveryControllerNearby({
        query: {
          targetRole,
          cursor,
          limit: 20,
          radiusKm: filters.radiusKm,
          ...(filters.serviceIds.length
            ? { serviceIds: filters.serviceIds }
            : {}),
          ...(filters.minPrice !== undefined
            ? { minPrice: filters.minPrice }
            : {}),
          ...(filters.maxPrice !== undefined
            ? { maxPrice: filters.maxPrice }
            : {}),
          availableOnly: filters.availableOnly,
          verifiedOnly: filters.verifiedOnly,
        },
        signal,
      }),
    );
    return {
      items: page.items.map(toNearbyCandidate),
      nextCursor: page.nextCursor,
    };
  },

  async updateExactLocation(input: PutLocationDto) {
    return unwrap(await discoveryControllerPutLocation({ body: input }));
  },

  async clearExactLocation() {
    return unwrap(await discoveryControllerDeleteLocation());
  },

  async presence() {
    return unwrap(await discoveryControllerPresence());
  },

  async updatePresence(input: PutPresenceDto) {
    return unwrap(await discoveryControllerPutPresence({ body: input }));
  },
};

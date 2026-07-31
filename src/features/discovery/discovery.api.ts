import {
  catalogControllerServices,
  discoveryControllerCandidates,
  discoveryControllerPutLocation,
  relationshipsControllerDecide,
  relationshipsControllerIncoming,
  relationshipsControllerMatchDetail,
  relationshipsControllerMatches,
  relationshipsControllerSwipe,
  relationshipsControllerUnmatch,
  uploadsControllerAccessUrl,
} from '@/generated/api/sdk.gen';
import type {
  DiscoveryCandidatePage,
  InterestPage,
  MatchPage,
  PutLocationDto,
  SwipeDto,
} from '@/generated/api/types.gen';
import { unwrap } from '@/services/api/result';

import {
  reconcileMatches,
  toDiscoveryCandidate,
  toIncomingInterest,
  type DiscoveryFilters,
} from './discovery.types';

export const discoveryApi = {
  async services() {
    return unwrap(await catalogControllerServices());
  },

  async candidates(
    filters: DiscoveryFilters,
    cursor?: string,
    signal?: AbortSignal,
  ) {
    const page: DiscoveryCandidatePage = unwrap(
      await discoveryControllerCandidates({
        query: {
          targetRole: 'PHOTOGRAPHER',
          cursor,
          limit: 20,
          ...(filters.nearbyOnly ? { radiusKm: filters.radiusKm } : {}),
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
      items: page.items.map(toDiscoveryCandidate),
      nextCursor: page.nextCursor,
    };
  },

  async updateExactLocation(location: PutLocationDto) {
    return unwrap(
      await discoveryControllerPutLocation({
        body: location,
      }),
    );
  },

  async swipe(input: SwipeDto) {
    return unwrap(
      await relationshipsControllerSwipe({
        body: input,
      }),
    );
  },

  async incoming(cursor?: string, signal?: AbortSignal) {
    const page: InterestPage = unwrap(
      await relationshipsControllerIncoming({
        query: { cursor, limit: 20 },
        signal,
      }),
    );
    return {
      items: page.items.map(toIncomingInterest),
      nextCursor: page.nextCursor,
    };
  },

  async decide(
    interestId: string,
    decision: 'ACCEPT' | 'REJECT',
    idempotencyKey: string,
  ) {
    return unwrap(
      await relationshipsControllerDecide({
        path: { interestId },
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { decision },
      }),
    );
  },

  async matches(cursor?: string, signal?: AbortSignal) {
    const page: MatchPage = unwrap(
      await relationshipsControllerMatches({
        query: { cursor, limit: 20 },
        signal,
      }),
    );
    return {
      items: reconcileMatches([], page.items),
      nextCursor: page.nextCursor,
    };
  },

  async match(matchId: string, signal?: AbortSignal) {
    return unwrap(
      await relationshipsControllerMatchDetail({
        path: { matchId },
        signal,
      }),
    );
  },

  async unmatch(matchId: string, reason: string, idempotencyKey: string) {
    return unwrap(
      await relationshipsControllerUnmatch({
        path: { matchId },
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { reason },
      }),
    );
  },

  async assetUrl(assetId: string, signal?: AbortSignal) {
    return unwrap(
      await uploadsControllerAccessUrl({
        path: { assetId },
        signal,
      }),
    ).url;
  },
};

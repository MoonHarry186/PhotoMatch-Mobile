import { z } from 'zod';

import type {
  DiscoveryCandidateResponse,
  InterestResponse,
  MatchResponse,
} from '@/generated/api/types.gen';

export const LEFT_COOLDOWN_DAYS = 7;
export const REMATCH_COOLDOWN_DAYS = 30;
export const DISCOVERY_IMAGE_PRELOAD_LIMIT = 2;

export const discoveryFiltersSchema = z
  .object({
    serviceIds: z.array(z.string().uuid()).default([]),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    nearbyOnly: z.boolean().default(false),
    radiusKm: z.number().int().min(1).max(100).default(20),
    availableOnly: z.boolean().default(false),
    verifiedOnly: z.boolean().default(false),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: 'Giá tối thiểu không được lớn hơn giá tối đa',
      path: ['maxPrice'],
    },
  );

export type DiscoveryFilters = z.infer<typeof discoveryFiltersSchema>;

export const defaultDiscoveryFilters: DiscoveryFilters = {
  serviceIds: [],
  nearbyOnly: false,
  radiusKm: 20,
  availableOnly: false,
  verifiedOnly: false,
};

export type DiscoveryCandidate = {
  userRoleId: string;
  displayName: string;
  avatarAssetId: string | null;
  headline: string | null;
  availabilityStatus: string | null;
  verified: boolean;
  distance: string | null;
};

export function toDiscoveryCandidate(
  value: DiscoveryCandidateResponse,
): DiscoveryCandidate {
  return {
    userRoleId: value.userRoleId,
    displayName: value.displayName?.trim() || 'Người dùng PhotoMatch',
    avatarAssetId: value.avatarAssetId ?? null,
    headline: value.headline ?? null,
    availabilityStatus: value.availabilityStatus ?? null,
    verified: value.identityVerificationStatus === 'VERIFIED',
    distance: value.distance ?? null,
  };
}

export type IncomingInterest = {
  id: string;
  createdAt: string;
  source: InterestResponse['source'];
  customer: {
    userRoleId: string;
    displayName: string;
    avatarAssetId: string | null;
    city: string | null;
    verified: boolean;
  };
};

export function toIncomingInterest(value: InterestResponse): IncomingInterest {
  const rawCity = value.customer.city as unknown;
  const city =
    typeof rawCity === 'string'
      ? rawCity
      : rawCity &&
          typeof rawCity === 'object' &&
          'name' in rawCity &&
          typeof rawCity.name === 'string'
        ? rawCity.name
        : null;
  return {
    id: value.id,
    createdAt: value.createdAt,
    source: value.source,
    customer: {
      userRoleId: value.customer.userRoleId,
      displayName:
        value.customer.displayName?.trim() || 'Khách hàng PhotoMatch',
      avatarAssetId: value.customer.avatarAssetId ?? null,
      city,
      verified: value.customer.identityVerificationStatus === 'VERIFIED',
    },
  };
}

export type MatchSummary = MatchResponse;

export function reconcileMatches(
  current: MatchSummary[],
  incoming: MatchSummary[],
): MatchSummary[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort(
    (left, right) =>
      new Date(right.matchedAt).getTime() - new Date(left.matchedAt).getTime(),
  );
}

export function roleDiscoveryActions(role: 'CUSTOMER' | 'PHOTOGRAPHER') {
  return role === 'CUSTOMER'
    ? {
        canBrowseCandidates: true,
        canSwipeLeft: true,
        canSwipeRight: true,
        canDecideIncoming: false,
      }
    : {
        canBrowseCandidates: false,
        canSwipeLeft: false,
        canSwipeRight: false,
        canDecideIncoming: true,
      };
}

export function relationshipErrorMessage(error: {
  businessCode?: string;
}): string | null {
  if (error.businessCode === 'FEATURE_NOT_AVAILABLE')
    return 'Photographer chưa thể chủ động gửi quan tâm trong MVP.';
  if (error.businessCode === 'REMATCH_COOLDOWN')
    return `Hai tài khoản cần chờ ${REMATCH_COOLDOWN_DAYS} ngày trước khi kết nối lại.`;
  if (error.businessCode === 'RELATIONSHIP_BLOCKED')
    return 'Không thể tương tác vì mối quan hệ đang bị chặn.';
  if (error.businessCode === 'CANDIDATE_INELIGIBLE')
    return 'Hồ sơ này hiện không còn đủ điều kiện xuất hiện trong Khám phá.';
  return null;
}

export function locationPermissionMessage(
  permission:
    'undetermined' | 'granted' | 'denied' | 'restricted' | 'services-disabled',
) {
  if (permission === 'services-disabled')
    return 'Dịch vụ vị trí đang tắt. Hãy bật lại trước khi dùng Gần tôi.';
  if (permission === 'restricted')
    return 'Quyền vị trí đang bị chặn. Hãy cho phép trong Cài đặt để dùng Gần tôi.';
  return 'Bạn cần cấp quyền vị trí để bật bộ lọc Gần tôi.';
}

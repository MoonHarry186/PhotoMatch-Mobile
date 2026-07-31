import { z } from 'zod';

import type {
  DiscoveryCandidateResponse,
  DiscoveryPresenceResponse,
} from '@/generated/api/types.gen';

export const nearbyFiltersSchema = z
  .object({
    serviceIds: z.array(z.string().uuid()).default([]),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
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

export type NearbyFilters = z.infer<typeof nearbyFiltersSchema>;

export const defaultNearbyFilters: NearbyFilters = {
  serviceIds: [],
  radiusKm: 20,
  availableOnly: false,
  verifiedOnly: false,
};

export type NearbyCandidate = {
  userRoleId: string;
  displayName: string;
  avatarAssetId: string | null;
  headline: string | null;
  availabilityStatus: string | null;
  verified: boolean;
  distance: string;
};

export function toNearbyCandidate(
  value: DiscoveryCandidateResponse,
): NearbyCandidate {
  return {
    userRoleId: value.userRoleId,
    displayName: value.displayName?.trim() || 'Người dùng PhotoMatch',
    avatarAssetId: value.avatarAssetId ?? null,
    headline: value.headline ?? null,
    availabilityStatus: value.availabilityStatus ?? null,
    verified: value.identityVerificationStatus === 'VERIFIED',
    distance: value.distance ?? 'Khoảng cách chưa xác định',
  };
}

export type PresencePresentation = 'disabled' | 'visible' | 'expired';

export function presencePresentation(
  value: DiscoveryPresenceResponse | undefined,
  now = Date.now(),
): PresencePresentation {
  if (!value?.isVisible) return 'disabled';
  if (!value.visibleUntil || new Date(value.visibleUntil).getTime() <= now)
    return 'expired';
  return 'visible';
}

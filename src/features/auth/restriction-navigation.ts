import type { AppError } from '@/core/errors';

export type RestrictionRouteParams = {
  accountStatus?: 'SUSPENDED' | 'BANNED' | 'DELETED';
  penaltyType?: 'TEMPORARY_SUSPENSION' | 'PERMANENT_BAN';
  reason?: string;
  endsAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function restrictionAccountStatus(
  value: unknown,
): RestrictionRouteParams['accountStatus'] {
  return value === 'SUSPENDED' || value === 'BANNED' || value === 'DELETED'
    ? value
    : undefined;
}

function restrictionPenaltyType(
  value: unknown,
): RestrictionRouteParams['penaltyType'] {
  return value === 'TEMPORARY_SUSPENSION' || value === 'PERMANENT_BAN'
    ? value
    : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function restrictionParamsFromError(
  error: AppError,
): RestrictionRouteParams | null {
  if (error.businessCode !== 'ACCOUNT_RESTRICTED') return null;

  const details = isRecord(error.details) ? error.details : undefined;
  const restrictions = Array.isArray(details?.restrictions)
    ? details.restrictions
    : [];
  const restriction = restrictions.find(
    (item) =>
      isRecord(item) &&
      (item.penaltyType === 'TEMPORARY_SUSPENSION' ||
        item.penaltyType === 'PERMANENT_BAN'),
  );
  const penalty = isRecord(restriction) ? restriction : undefined;
  const params: RestrictionRouteParams = {};
  const accountStatus = restrictionAccountStatus(details?.accountStatus);
  const penaltyType = restrictionPenaltyType(penalty?.penaltyType);
  const reason = optionalString(penalty?.reason);
  const endsAt = optionalString(penalty?.endsAt);

  if (accountStatus) params.accountStatus = accountStatus;
  if (penaltyType) params.penaltyType = penaltyType;
  if (reason) params.reason = reason;
  if (endsAt) params.endsAt = endsAt;
  return params;
}

export function restrictionRoute(params: RestrictionRouteParams) {
  return {
    pathname: '/(public)/restriction' as const,
    params,
  };
}

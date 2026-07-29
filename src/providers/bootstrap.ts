import type {
  OnboardingProgressResponse,
  PenaltyResponse,
  UserSummary,
} from '@/generated/api/types.gen';

export type Gate =
  'signed-out' | 'verification' | 'restriction' | 'onboarding' | 'app';

export type BootstrapSnapshot = {
  user: UserSummary;
  restrictions: PenaltyResponse[];
  onboarding: OnboardingProgressResponse;
};

export function resolveGate(snapshot: BootstrapSnapshot | null): Gate {
  if (!snapshot) return 'signed-out';
  if (!snapshot.user.emailVerified) return 'verification';
  if (
    snapshot.restrictions.some(
      (item) =>
        item.status === 'ACTIVE' &&
        (item.penaltyType === 'TEMPORARY_SUSPENSION' ||
          item.penaltyType === 'PERMANENT_BAN'),
    )
  ) {
    return 'restriction';
  }
  if (!snapshot.onboarding.complete) return 'onboarding';
  return 'app';
}

import type {
  ConsentResponse,
  LegalDocumentResponse,
  OnboardingProgressResponse,
  PenaltyResponse,
  UserSummary,
} from '@/generated/api/types.gen';

export type Gate =
  | 'signed-out'
  | 'verification'
  | 'restriction'
  | 'legal'
  | 'onboarding'
  | 'app';

export type BootstrapSnapshot = {
  user: UserSummary;
  restrictions: PenaltyResponse[];
  currentLegal: LegalDocumentResponse[];
  consents: ConsentResponse[];
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
  const acceptedIds = new Set(
    snapshot.consents.map((item) => item.legalDocumentId),
  );
  if (snapshot.currentLegal.some((item) => !acceptedIds.has(item.id)))
    return 'legal';
  if (!snapshot.onboarding.complete) return 'onboarding';
  return 'app';
}

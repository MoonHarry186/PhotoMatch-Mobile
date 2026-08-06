import type {
  OnboardingProgressResponse,
  RoleSummary,
} from '@/generated/api/types.gen';
import type { MessageKey } from '@/i18n/messages';

import type { RoleCode } from './onboarding.types';

export type OnboardingStep = 'personal' | 'avatar' | 'provider';
export const onboardingSteps: readonly OnboardingStep[] = [
  'personal',
  'avatar',
  'provider',
];

const orderedRules: {
  step: OnboardingStep;
  missing: readonly string[];
}[] = [
  { step: 'personal', missing: ['displayName', 'dateOfBirth', 'city'] },
  { step: 'avatar', missing: ['avatar'] },
  { step: 'provider', missing: ['providerChoice', 'role'] },
];

export function firstIncompleteStep(
  progress: Pick<OnboardingProgressResponse, 'complete' | 'missing'>,
): OnboardingStep {
  if (progress.complete) return 'provider';
  const missing = new Set(progress.missing);
  return (
    orderedRules.find((rule) => rule.missing.some((item) => missing.has(item)))
      ?.step ?? 'provider'
  );
}

export function nextIncompleteStep(
  progress: Pick<OnboardingProgressResponse, 'missing'>,
  current: OnboardingStep,
): OnboardingStep {
  const currentIndex = orderedRules.findIndex((item) => item.step === current);
  const missing = new Set(progress.missing);
  return (
    orderedRules
      .slice(currentIndex + 1)
      .find((rule) => rule.missing.some((item) => missing.has(item)))?.step ??
    'provider'
  );
}

export function previousOnboardingStep(
  current: OnboardingStep,
): OnboardingStep | null {
  return onboardingSteps[onboardingSteps.indexOf(current) - 1] ?? null;
}

export function nextOnboardingStep(
  current: OnboardingStep,
): OnboardingStep | null {
  return onboardingSteps[onboardingSteps.indexOf(current) + 1] ?? null;
}

export const missingLabelKeys: Record<string, MessageKey> = {
  role: 'onboarding.missing.role',
  providerChoice: 'onboarding.missing.providerChoice',
  displayName: 'onboarding.missing.displayName',
  dateOfBirth: 'onboarding.missing.dateOfBirth',
  city: 'onboarding.missing.city',
  avatar: 'onboarding.missing.avatar',
  location: 'onboarding.missing.location',
  activityFields: 'onboarding.missing.activityFields',
  services: 'onboarding.missing.services',
  portfolioImages: 'onboarding.missing.portfolioImages',
};

export const discoveryReasonLabelKeys: Record<string, MessageKey> = {
  account: 'onboarding.reason.account',
  profile: 'onboarding.reason.profile',
  visibility: 'onboarding.reason.visibility',
  photographerProfile: 'onboarding.reason.photographerProfile',
  offeredServices: 'onboarding.reason.offeredServices',
  portfolioImages: 'onboarding.reason.portfolioImages',
  servicePricing: 'onboarding.reason.servicePricing',
  penalty: 'onboarding.reason.penalty',
  role: 'onboarding.reason.role',
};

export function canChooseAdditionalRole(
  roles: RoleSummary[],
  onboardingCompletedAt?: string | null,
): boolean {
  return !onboardingCompletedAt && roles.length < 2;
}

export function findRole(
  roles: RoleSummary[],
  code: RoleCode,
): RoleSummary | undefined {
  return roles.find((role) => role.code === code);
}

export function portfolioWarning(role: RoleCode, count: number): string | null {
  if (role !== 'PHOTOGRAPHER' || count >= 6) return null;
  return `Portfolio hiện có ${count}/6 ảnh. Hồ sơ chưa đủ điều kiện xuất hiện trong khám phá.`;
}

export function invalidCatalogSelection(
  selectedIds: string[],
  catalogIds: string[],
): string[] {
  const allowed = new Set(catalogIds);
  return selectedIds.filter((id) => !allowed.has(id));
}

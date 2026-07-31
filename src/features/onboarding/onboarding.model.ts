import type {
  OnboardingProgressResponse,
  RoleSummary,
} from '@/generated/api/types.gen';

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

export const missingLabels: Record<string, string> = {
  role: 'Vai trò hiện tại',
  providerChoice: 'Lựa chọn cung cấp dịch vụ',
  displayName: 'Tên hiển thị',
  dateOfBirth: 'Ngày sinh',
  city: 'Thành phố',
  avatar: 'Ảnh đại diện',
  location: 'Vị trí hiện tại',
  activityFields: 'Lĩnh vực hoạt động',
  services: 'Dịch vụ và nhu cầu',
  portfolioImages: 'Ít nhất 6 ảnh portfolio',
};

export const discoveryReasonLabels: Record<string, string> = {
  account: 'Tài khoản chưa hoạt động',
  profile: 'Hồ sơ chưa hoạt động',
  visibility: 'Hồ sơ đang bị ẩn',
  photographerProfile: 'Thiếu hồ sơ photographer',
  offeredServices: 'Thiếu dịch vụ cung cấp',
  portfolioImages: 'Portfolio cần ít nhất 6 ảnh',
  servicePricing: 'Dịch vụ cung cấp cần đủ khoảng giá VND',
  penalty: 'Tài khoản đang có hạn chế',
  role: 'Chưa chọn vai trò',
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

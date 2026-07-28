import type {
  CatalogItemResponse,
  OnboardingProgressResponse,
  RoleSummary,
  ServiceSelectionDto,
  UserSummary,
} from '@/generated/api/types.gen';

export type RoleCode = 'CUSTOMER' | 'PHOTOGRAPHER';

export type SelfProfile = {
  displayName?: string | null;
  dateOfBirth?: string | null;
  bio?: string | null;
  cityId?: string | null;
  avatarAssetId?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'HIDDEN' | 'SUSPENDED';
  city?: Pick<CatalogItemResponse, 'id' | 'code' | 'name'> | null;
};

export type ActivityFieldSelection = {
  activityField: CatalogItemResponse;
};

export type ServiceCatalogItem = CatalogItemResponse & {
  activityFieldId: string;
};

export type ServiceSelection = ServiceSelectionDto & {
  currency?: string;
  service: ServiceCatalogItem;
};

export type PhotographerProfile = {
  userRoleId: string;
  headline?: string | null;
  yearsExperience?: number | null;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE';
};

export type RoleSwitchResult = {
  currentRoleId: string;
  role: RoleCode;
  accessTokenRefreshRequired?: boolean;
};

export type NormalizedUser = UserSummary & {
  roles: RoleSummary[];
};

export type OnboardingData = {
  progress: OnboardingProgressResponse;
  profile?: SelfProfile;
};

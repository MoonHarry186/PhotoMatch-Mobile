import {
  catalogControllerCities,
  discoveryControllerDeleteLocation,
  discoveryControllerPresence,
  discoveryControllerPutLocation,
  discoveryControllerPutPresence,
  meControllerAddRole,
  meControllerAvailableRoles,
  meControllerMe,
  meControllerSwitchRole,
  profilesControllerAttachAvatar,
  profilesControllerDeleteAvatar,
  profilesControllerFields,
  profilesControllerOnboardingProgress,
  profilesControllerPhotographerSelf,
  profilesControllerPortfolio,
  profilesControllerReplaceFields,
  profilesControllerReplaceServices,
  profilesControllerSelf,
  profilesControllerServices,
  profilesControllerSettings,
  profilesControllerUpdatePhotographer,
  profilesControllerUpdateSelf,
  profilesControllerUpdateSettings,
  uploadsControllerAccessUrl,
  uploadsControllerComplete,
  uploadsControllerPresign,
} from '@/generated/api/sdk.gen';
import type {
  CatalogItemResponse,
  OnboardingProgressResponse,
  PortfolioItemResponse,
  PutLocationDto,
  PutPresenceDto,
  RoleSummary,
  ServiceSelectionDto,
  SettingsResponse,
  UpdatePhotographerProfileDto,
  UpdateProfileDto,
  UserSummary,
} from '@/generated/api/types.gen';
import { apiRequest } from '@/core/api/api-client';
import { createSubmissionKey } from '@/services/api/idempotency';
import { unwrap } from '@/services/api/result';

import type {
  ActivityFieldSelection,
  PhotographerProfile,
  RoleCode,
  RoleSwitchResult,
  SelfProfile,
  ServiceCatalogItem,
  ServiceSelection,
} from './onboarding.types';

type RuntimeRole = {
  id: string;
  status?: 'ACTIVE' | 'INACTIVE';
  code?: RoleCode;
  name?: string;
  role?: { code: RoleCode; name: string };
};

function normalizeRole(input: RuntimeRole): RoleSummary {
  return {
    id: input.id,
    code: input.code ?? input.role?.code ?? 'CUSTOMER',
    name: input.name ?? input.role?.name ?? input.code ?? 'Customer',
    status: input.status,
  };
}

export function normalizeUserSummary(input: UserSummary): UserSummary {
  const runtime = input as UserSummary & { roles: RuntimeRole[] };
  return {
    ...input,
    roles: runtime.roles.map(normalizeRole),
  };
}

function normalizeAddedRole(input: RoleSummary): RoleSummary {
  return normalizeRole(input as RoleSummary & RuntimeRole);
}

function selectedFieldsFromRuntime(value: unknown): ActivityFieldSelection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as {
      activityField?: CatalogItemResponse;
      id?: string;
      code?: string;
      name?: string;
      status?: CatalogItemResponse['status'];
    };
    const activityField =
      record.activityField ??
      (record.id && record.code && record.name
        ? {
            id: record.id,
            code: record.code,
            name: record.name,
            status: record.status ?? 'ACTIVE',
          }
        : undefined);
    return activityField ? [{ activityField }] : [];
  });
}

function selectedServicesFromRuntime(value: unknown): ServiceSelection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as ServiceSelection & {
      minPrice?: number | string;
      maxPrice?: number | string;
    };
    if (!record.service?.id) return [];
    return [
      {
        ...record,
        minPrice:
          record.minPrice === undefined ? undefined : Number(record.minPrice),
        maxPrice:
          record.maxPrice === undefined ? undefined : Number(record.maxPrice),
      },
    ];
  });
}

export const onboardingApi = {
  async me(): Promise<UserSummary> {
    return normalizeUserSummary(unwrap(await meControllerMe()));
  },
  async progress(): Promise<OnboardingProgressResponse> {
    return unwrap(await profilesControllerOnboardingProgress());
  },
  async self(): Promise<SelfProfile> {
    return unwrap(await profilesControllerSelf()) as SelfProfile;
  },
  async updateSelf(input: UpdateProfileDto): Promise<SelfProfile> {
    return unwrap(
      await profilesControllerUpdateSelf({ body: input }),
    ) as SelfProfile;
  },
  async cities(): Promise<CatalogItemResponse[]> {
    return unwrap(await catalogControllerCities());
  },
  async availableRoles(): Promise<RoleSummary[]> {
    return unwrap(await meControllerAvailableRoles());
  },
  async addRole(role: RoleCode): Promise<RoleSummary> {
    return normalizeAddedRole(
      unwrap(await meControllerAddRole({ body: { role } })),
    );
  },
  async switchRole(userRoleId: string): Promise<RoleSwitchResult> {
    return unwrap(
      await meControllerSwitchRole({ body: { userRoleId } }),
    ) as unknown as RoleSwitchResult;
  },
  async fieldsForRole(role: RoleCode): Promise<CatalogItemResponse[]> {
    return apiRequest(
      `/api/v1/activity-fields?role=${encodeURIComponent(role)}`,
    );
  },
  async selectedFields(userRoleId: string): Promise<ActivityFieldSelection[]> {
    return selectedFieldsFromRuntime(
      unwrap(
        await profilesControllerFields({ path: { userRoleId } }),
      ) as unknown,
    );
  },
  async replaceFields(
    userRoleId: string,
    activityFieldIds: string[],
  ): Promise<ActivityFieldSelection[]> {
    return selectedFieldsFromRuntime(
      unwrap(
        await profilesControllerReplaceFields({
          path: { userRoleId },
          body: { activityFieldIds },
        }),
      ) as unknown,
    );
  },
  async servicesForFields(
    activityFieldIds: string[],
  ): Promise<ServiceCatalogItem[]> {
    const groups = await Promise.all(
      activityFieldIds.map((activityFieldId) =>
        apiRequest<ServiceCatalogItem[]>(
          `/api/v1/services?activityFieldId=${encodeURIComponent(activityFieldId)}`,
        ),
      ),
    );
    return Array.from(
      new Map(groups.flat().map((item) => [item.id, item])).values(),
    );
  },
  async selectedServices(userRoleId: string): Promise<ServiceSelection[]> {
    return selectedServicesFromRuntime(
      unwrap(
        await profilesControllerServices({ path: { userRoleId } }),
      ) as unknown,
    );
  },
  async replaceServices(
    userRoleId: string,
    services: ServiceSelectionDto[],
  ): Promise<ServiceSelection[]> {
    return selectedServicesFromRuntime(
      unwrap(
        await profilesControllerReplaceServices({
          path: { userRoleId },
          body: { services },
        }),
      ) as unknown,
    );
  },
  async putLocation(input: PutLocationDto) {
    return unwrap(await discoveryControllerPutLocation({ body: input }));
  },
  async deleteLocation() {
    return unwrap(await discoveryControllerDeleteLocation());
  },
  async presence() {
    return unwrap(await discoveryControllerPresence());
  },
  async putPresence(input: PutPresenceDto) {
    return unwrap(await discoveryControllerPutPresence({ body: input }));
  },
  async settings(): Promise<SettingsResponse> {
    return unwrap(await profilesControllerSettings());
  },
  async updateVisibility(profileVisibilityEnabled: boolean) {
    return unwrap(
      await profilesControllerUpdateSettings({
        body: { profileVisibilityEnabled },
      }),
    );
  },
  async updateSettings(
    input: Parameters<typeof profilesControllerUpdateSettings>[0]['body'],
  ) {
    return unwrap(await profilesControllerUpdateSettings({ body: input }));
  },
  async photographerSelf(): Promise<PhotographerProfile> {
    return unwrap(
      await profilesControllerPhotographerSelf(),
    ) as unknown as PhotographerProfile;
  },
  async updatePhotographer(input: UpdatePhotographerProfileDto) {
    return unwrap(
      await profilesControllerUpdatePhotographer({ body: input }),
    ) as unknown as PhotographerProfile;
  },
  async portfolio(userRoleId: string): Promise<PortfolioItemResponse[]> {
    return unwrap(await profilesControllerPortfolio({ path: { userRoleId } }));
  },
  async assetUrl(assetId: string): Promise<string> {
    return unwrap(await uploadsControllerAccessUrl({ path: { assetId } })).url;
  },
  async deleteAvatar() {
    return unwrap(await profilesControllerDeleteAvatar());
  },
};

export type AvatarUploadInput = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
};

function extensionFor(input: AvatarUploadInput, mimeType: string) {
  const fromName = input.fileName?.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp'].includes(fromName))
    return fromName === 'jpeg' ? 'jpg' : fromName;
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadAndAttachAvatar(
  input: AvatarUploadInput,
  onProgress: (value: number) => void,
): Promise<SelfProfile> {
  onProgress(0.05);
  const localResponse = await fetch(input.uri);
  if (!localResponse.ok)
    throw new Error('Không thể đọc ảnh đã chọn trên thiết bị');
  const bytes = await localResponse.arrayBuffer();
  const mimeType = input.mimeType ?? 'image/jpeg';
  const extension = extensionFor(input, mimeType);
  onProgress(0.2);
  const presign = unwrap(
    await uploadsControllerPresign({
      body: {
        purpose: 'AVATAR',
        mimeType,
        extension,
        sizeBytes: input.fileSize ?? bytes.byteLength,
      },
    }),
  );
  onProgress(0.35);
  const uploadResponse = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: presign.requiredHeaders,
    body: bytes,
  });
  if (!uploadResponse.ok) throw new Error('Không thể tải ảnh lên kho lưu trữ');
  onProgress(0.75);
  const submission = createSubmissionKey();
  const asset = unwrap(
    await uploadsControllerComplete({
      path: { uploadId: presign.uploadId },
      headers: { 'Idempotency-Key': submission.current() },
      body: { checksum: '' },
    }),
  );
  submission.complete();
  onProgress(0.9);
  const profile = unwrap(
    await profilesControllerAttachAvatar({ body: { assetId: asset.id } }),
  ) as SelfProfile;
  onProgress(1);
  return profile;
}

import {
  bookingsControllerPhotographerReviews,
  profilesControllerCreatePortfolio,
  profilesControllerDeletePortfolio,
  profilesControllerPortfolio,
  profilesControllerPortfolioDetail,
  profilesControllerPublicPortfolio,
  profilesControllerPublicProfile,
  profilesControllerReorderPortfolio,
  profilesControllerUpdatePortfolio,
  uploadsControllerComplete,
  uploadsControllerPresign,
} from '@/generated/api/sdk.gen';
import type {
  CreatePortfolioItemDto,
  PortfolioItemResponse,
  PublicProfileResponse,
  ReorderPortfolioDto,
  ReviewCollectionResponse,
  UpdatePortfolioItemDto,
} from '@/generated/api/types.gen';
import { createSubmissionKey } from '@/services/api/idempotency';
import { unwrap } from '@/services/api/result';
import {
  onboardingApi,
  type AvatarUploadInput,
} from '@/features/onboarding/onboarding.api';

export const MAX_PORTFOLIO_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function extensionFor(input: AvatarUploadInput, mimeType: string) {
  const nameExtension = input.fileName?.split('.').pop()?.toLowerCase();
  if (nameExtension && ['jpg', 'jpeg', 'png', 'webp'].includes(nameExtension)) {
    return nameExtension === 'jpeg' ? 'jpg' : nameExtension;
  }
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export const profileApi = {
  async publicProfile(userRoleId: string): Promise<PublicProfileResponse> {
    return unwrap(
      await profilesControllerPublicProfile({ path: { userRoleId } }),
    );
  },
  async publicPortfolio(
    photographerRoleId: string,
    cursor?: string,
    limit = 12,
  ) {
    return unwrap(
      await profilesControllerPublicPortfolio({
        path: { photographerRoleId },
        query: { cursor, limit },
      }),
    );
  },
  async reviews(
    photographerRoleId: string,
    cursor?: string,
    limit = 10,
  ): Promise<ReviewCollectionResponse> {
    return unwrap(
      await bookingsControllerPhotographerReviews({
        path: { photographerRoleId },
        query: { cursor, limit },
      }),
    );
  },
  async portfolio(userRoleId: string): Promise<PortfolioItemResponse[]> {
    return unwrap(await profilesControllerPortfolio({ path: { userRoleId } }));
  },
  async portfolioDetail(userRoleId: string, itemId: string) {
    return unwrap(
      await profilesControllerPortfolioDetail({ path: { userRoleId, itemId } }),
    );
  },
  async createPortfolio(userRoleId: string, input: CreatePortfolioItemDto) {
    return unwrap(
      await profilesControllerCreatePortfolio({
        path: { userRoleId },
        body: input,
      }),
    );
  },
  async updatePortfolio(
    userRoleId: string,
    itemId: string,
    input: UpdatePortfolioItemDto,
  ) {
    return unwrap(
      await profilesControllerUpdatePortfolio({
        path: { userRoleId, itemId },
        body: input,
      }),
    );
  },
  async deletePortfolio(userRoleId: string, itemId: string) {
    return unwrap(
      await profilesControllerDeletePortfolio({ path: { userRoleId, itemId } }),
    );
  },
  async reorderPortfolio(
    userRoleId: string,
    items: ReorderPortfolioDto['items'],
  ) {
    return unwrap(
      await profilesControllerReorderPortfolio({
        path: { userRoleId },
        body: { items },
      }),
    );
  },
  async uploadPortfolio(
    input: AvatarUploadInput,
    onProgress: (value: number) => void,
  ) {
    const mimeType = input.mimeType ?? 'image/jpeg';
    if (!ACCEPTED_MIME_TYPES.has(mimeType))
      throw new Error('Portfolio chỉ hỗ trợ JPG, PNG hoặc WebP');
    if (input.fileSize && input.fileSize > MAX_PORTFOLIO_BYTES)
      throw new Error('Ảnh portfolio không được vượt quá 10 MB');
    onProgress(0.05);
    const localResponse = await fetch(input.uri);
    if (!localResponse.ok)
      throw new Error('Không thể đọc ảnh đã chọn trên thiết bị');
    const bytes = await localResponse.arrayBuffer();
    if (bytes.byteLength > MAX_PORTFOLIO_BYTES)
      throw new Error('Ảnh portfolio không được vượt quá 10 MB');
    const presign = unwrap(
      await uploadsControllerPresign({
        body: {
          purpose: 'PORTFOLIO',
          mimeType,
          extension: extensionFor(input, mimeType),
          sizeBytes: input.fileSize ?? bytes.byteLength,
        },
      }),
    );
    onProgress(0.3);
    const uploaded = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: presign.requiredHeaders,
      body: bytes,
    });
    if (!uploaded.ok)
      throw new Error('Không thể tải ảnh portfolio lên kho lưu trữ');
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
    onProgress(1);
    return asset;
  },
  assetUrl: onboardingApi.assetUrl,
};

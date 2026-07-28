jest.mock('@/generated/api/sdk.gen', () => ({
  profilesControllerPublicProfile: jest.fn(),
  profilesControllerPublicPortfolio: jest.fn(),
  bookingsControllerPhotographerReviews: jest.fn(),
  profilesControllerPortfolio: jest.fn(),
  profilesControllerPortfolioDetail: jest.fn(),
  profilesControllerCreatePortfolio: jest.fn(),
  profilesControllerUpdatePortfolio: jest.fn(),
  profilesControllerDeletePortfolio: jest.fn(),
  profilesControllerReorderPortfolio: jest.fn(),
  uploadsControllerPresign: jest.fn(),
  uploadsControllerComplete: jest.fn(),
  uploadsControllerAccessUrl: jest.fn(),
}));

import {
  bookingsControllerPhotographerReviews,
  profilesControllerCreatePortfolio,
  profilesControllerDeletePortfolio,
  profilesControllerPublicPortfolio,
  profilesControllerPublicProfile,
  profilesControllerReorderPortfolio,
  uploadsControllerAccessUrl,
  uploadsControllerComplete,
  uploadsControllerPresign,
} from '@/generated/api/sdk.gen';
import { profileApi } from '@/features/profile/profile.api';

describe('profile API adapters', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps public profile through the minimized public endpoint', async () => {
    (profilesControllerPublicProfile as jest.Mock).mockResolvedValue({
      data: {
        userRoleId: 'role-1',
        role: 'CUSTOMER',
        displayName: 'Minh',
        bio: null,
        avatarAssetId: null,
        city: null,
        identityVerificationStatus: 'UNVERIFIED',
        activityFields: [],
        services: [],
        rating: null,
      },
    });
    const result = await profileApi.publicProfile('role-1');
    expect(profilesControllerPublicProfile).toHaveBeenCalledWith({
      path: { userRoleId: 'role-1' },
    });
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('latitude');
  });

  it('preserves public pagination cursors and review neutral pages', async () => {
    (profilesControllerPublicPortfolio as jest.Mock).mockResolvedValue({
      data: { items: [], nextCursor: 'next' },
    });
    (bookingsControllerPhotographerReviews as jest.Mock).mockResolvedValue({
      data: { summary: { average: 0, count: 0 }, items: [], nextCursor: null },
    });
    await expect(
      profileApi.publicPortfolio('role-1', 'cursor', 12),
    ).resolves.toEqual({ items: [], nextCursor: 'next' });
    await expect(profileApi.reviews('role-1')).resolves.toMatchObject({
      summary: { count: 0 },
      items: [],
    });
    expect(profilesControllerPublicPortfolio).toHaveBeenCalledWith({
      path: { photographerRoleId: 'role-1' },
      query: { cursor: 'cursor', limit: 12 },
    });
  });

  it('uses canonical owner mutations for create, reorder and soft-delete', async () => {
    (profilesControllerCreatePortfolio as jest.Mock).mockResolvedValue({
      data: { id: 'item-1' },
    });
    (profilesControllerReorderPortfolio as jest.Mock).mockResolvedValue({
      data: [],
    });
    (profilesControllerDeletePortfolio as jest.Mock).mockResolvedValue({
      data: { status: 'deleted' },
    });
    await profileApi.createPortfolio('role-1', { assetId: 'asset-1' });
    await profileApi.reorderPortfolio('role-1', [
      { id: 'item-1', sortOrder: 0 },
    ]);
    await profileApi.deletePortfolio('role-1', 'item-1');
    expect(profilesControllerCreatePortfolio).toHaveBeenCalledWith({
      path: { userRoleId: 'role-1' },
      body: { assetId: 'asset-1' },
    });
    expect(profilesControllerReorderPortfolio).toHaveBeenCalledWith({
      path: { userRoleId: 'role-1' },
      body: { items: [{ id: 'item-1', sortOrder: 0 }] },
    });
    expect(profilesControllerDeletePortfolio).toHaveBeenCalledWith({
      path: { userRoleId: 'role-1', itemId: 'item-1' },
    });
  });

  it('reads a fresh signed asset URL after expiry', async () => {
    (uploadsControllerAccessUrl as jest.Mock)
      .mockResolvedValueOnce({ data: { url: 'https://cdn/expired' } })
      .mockResolvedValueOnce({ data: { url: 'https://cdn/refreshed' } });
    await expect(profileApi.assetUrl('asset-1')).resolves.toBe(
      'https://cdn/expired',
    );
    await expect(profileApi.assetUrl('asset-1')).resolves.toBe(
      'https://cdn/refreshed',
    );
    expect(uploadsControllerAccessUrl).toHaveBeenCalledTimes(2);
  });

  it('rejects unsupported files and allows a failed upload to be retried', async () => {
    await expect(
      profileApi.uploadPortfolio(
        { uri: 'file://bad', mimeType: 'application/pdf' },
        () => undefined,
      ),
    ).rejects.toThrow('JPG');
    (uploadsControllerPresign as jest.Mock).mockResolvedValue({
      data: {
        uploadId: 'upload-1',
        uploadUrl: 'https://cdn/upload',
        requiredHeaders: {},
        expiresAt: new Date().toISOString(),
      },
    });
    (uploadsControllerComplete as jest.Mock).mockResolvedValue({
      data: { id: 'asset-1' },
    });
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      } as Response)
      .mockResolvedValueOnce({ ok: true } as Response);
    const input = {
      uri: 'file://photo.jpg',
      mimeType: 'image/jpeg',
      fileName: 'photo.jpg',
      fileSize: 8,
    };
    await expect(
      profileApi.uploadPortfolio(input, () => undefined),
    ).rejects.toThrow('kho lưu trữ');
    await expect(
      profileApi.uploadPortfolio(input, () => undefined),
    ).resolves.toEqual({ id: 'asset-1' });
    fetchMock.mockRestore();
  });
});

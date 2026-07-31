jest.mock('expo-image-picker', () => ({
  getMediaLibraryPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [
      {
        uri: 'file:///replacement.jpg',
        fileName: 'replacement.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      },
    ],
  })),
}));

jest.mock('@/features/onboarding/onboarding.api', () => ({
  onboardingApi: {
    assetUrl: jest.fn(),
  },
  uploadAndAttachAvatar: jest.fn(
    async (
      _asset: unknown,
      onProgress: (progress: number) => void,
    ): Promise<void> => {
      onProgress(1);
    },
  ),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AvatarPicker } from '@/components/media/media-components';
import { AvatarSection } from '@/features/onboarding/onboarding-sections';

describe('AvatarPicker', () => {
  it('makes choosing and replacing an avatar explicit', async () => {
    const choose = await render(<AvatarPicker uri={null} onPick={jest.fn()} />);
    expect(
      choose.getByRole('button', { name: 'Chọn ảnh đại diện' }),
    ).toBeTruthy();
    expect(choose.getByText('Chọn ảnh đại diện')).toBeTruthy();

    const onPick = jest.fn();
    const replace = await render(
      <AvatarPicker uri="file:///current.jpg" onPick={onPick} />,
    );
    await fireEvent.press(
      replace.getByRole('button', { name: 'Thay ảnh đại diện' }),
    );

    await waitFor(() =>
      expect(onPick).toHaveBeenCalledWith(
        expect.objectContaining({ uri: 'file:///replacement.jpg' }),
      ),
    );
    expect(replace.getByText('Thay ảnh đại diện')).toBeTruthy();
  });

  it('stays on the avatar step until the user confirms the uploaded image', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false, gcTime: Infinity },
        queries: { retry: false, gcTime: Infinity },
      },
    });
    const onSaved = jest.fn();
    const view = await render(
      <QueryClientProvider client={queryClient}>
        <AvatarSection
          scope={{ userId: 'user-1', roleId: 'customer-role' }}
          onSaved={onSaved}
          showContinue
        />
      </QueryClientProvider>,
    );

    await fireEvent.press(
      view.getByRole('button', { name: 'Chọn ảnh đại diện' }),
    );

    await waitFor(() => expect(view.getByText('Xong, tiếp tục')).toBeTruthy());
    expect(onSaved).not.toHaveBeenCalled();
    expect(view.getByText('Thay ảnh đại diện')).toBeTruthy();

    await fireEvent.press(view.getByText('Xong, tiếp tục'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});

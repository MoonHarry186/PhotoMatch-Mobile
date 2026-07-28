import { fireEvent, render, waitFor } from '@testing-library/react-native';

import RestrictionRoute from '@/app/(public)/restriction';

const mockReplace = jest.fn();
const mockSignOut = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    accountStatus: 'SUSPENDED',
    penaltyType: 'TEMPORARY_SUSPENSION',
    reason: 'Vi phạm quy định cộng đồng',
    endsAt: '2026-08-01T12:00:00.000Z',
  }),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: () => ({
    snapshot: null,
    signOut: mockSignOut,
  }),
}));

describe('RestrictionRoute before authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the dedicated suspension state and returns to sign-in', async () => {
    const view = await render(<RestrictionRoute />);

    expect(
      view.getByTestId('restriction-content').props.contentContainerStyle,
    ).toMatchObject({ flexGrow: 1, justifyContent: 'center' });
    expect(
      view.getByRole('header', { name: 'Nhắc nhở thân thiện' }),
    ).toBeTruthy();
    expect(view.getByText(/Tài khoản của bạn hiện bị tạm ngưng/)).toBeTruthy();

    await fireEvent.press(
      view.getByRole('button', { name: 'Quay lại đăng nhập' }),
    );

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in'),
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

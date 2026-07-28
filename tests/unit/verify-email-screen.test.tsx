import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { VerifyEmailScreen } from '@/features/auth/verify-email-screen';
import { authApi } from '@/features/auth/auth.api';

const mockReplace = jest.fn();
const mockAcceptSession = jest.fn();
const mockSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 900,
  user: {
    id: 'user-1',
    email: 'user@example.com',
    accountStatus: 'ACTIVE' as const,
    emailVerified: true,
    roles: [],
    createdAt: '2026-07-28T00:00:00.000Z',
  },
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    email: 'user@example.com',
    challengeId: '11111111-1111-4111-8111-111111111111',
    expiresIn: '600',
    resendAfter: '60',
  }),
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/features/auth/auth.api', () => ({
  authApi: {
    verifyEmail: jest.fn(),
    resend: jest.fn(),
  },
}));

jest.mock('@/features/auth/auth-header', () => ({
  AuthHeader: () => null,
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: () => ({ acceptSession: mockAcceptSession }),
}));

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authApi.verifyEmail).mockResolvedValue(mockSession);
    mockAcceptSession.mockResolvedValue(undefined);
  });

  it('accepts a six-digit OTP and authenticates the verified account', async () => {
    const view = await render(<VerifyEmailScreen />);

    await fireEvent.changeText(view.getByLabelText('Chữ số OTP 1'), '12a3456');
    for (const [index, digit] of [...'123456'].entries()) {
      expect(view.getByLabelText(`Chữ số OTP ${index + 1}`).props.value).toBe(
        digit,
      );
    }
    await fireEvent.press(view.getByRole('button', { name: 'Xác minh' }));

    await waitFor(() =>
      expect(authApi.verifyEmail).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        '123456',
      ),
    );
    expect(mockAcceptSession).toHaveBeenCalledWith(mockSession);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('supports entering each digit separately and moving backward on delete', async () => {
    const view = await render(<VerifyEmailScreen />);

    for (const [index, digit] of [...'123456'].entries()) {
      await fireEvent.changeText(
        view.getByLabelText(`Chữ số OTP ${index + 1}`),
        digit,
      );
    }
    await fireEvent.changeText(view.getByLabelText('Chữ số OTP 6'), '');
    await fireEvent(view.getByLabelText('Chữ số OTP 6'), 'keyPress', {
      nativeEvent: { key: 'Backspace' },
    });

    expect(view.getByLabelText('Chữ số OTP 5').props.value).toBe('');
    expect(view.getByLabelText('Chữ số OTP 6').props.value).toBe('');
  });
});

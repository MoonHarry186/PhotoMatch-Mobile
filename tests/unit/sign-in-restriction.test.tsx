import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AppError } from '@/core/errors';
import { authApi } from '@/features/auth/auth.api';
import { SignInScreen } from '@/features/auth/sign-in-screen';

const mockReplace = jest.fn();
const mockAcceptSession = jest.fn();

jest.mock('expo-router', () => ({
  Link: () => null,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/features/auth/auth.api', () => ({
  authApi: { signIn: jest.fn(), resend: jest.fn() },
}));

jest.mock('@/features/auth/auth-header', () => ({
  AuthHeader: () => null,
}));

jest.mock('@/features/auth/oauth-buttons', () => ({
  OAuthButtons: () => null,
}));

jest.mock('@/features/auth/legal-consent-notice', () => ({
  LegalConsentNotice: () => null,
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: () => ({
    status: 'ready',
    snapshot: null,
    acceptSession: mockAcceptSession,
  }),
}));

jest.mock('@/i18n/i18n-provider', () => ({
  useI18n: () => ({
    t: (key: string) =>
      (
        ({
          'auth.email': 'Email',
          'auth.emailPlaceholder': 'Nhập địa chỉ email',
          'auth.password': 'Mật khẩu',
          'auth.passwordPlaceholder': 'Nhập mật khẩu',
          'auth.signIn': 'Đăng nhập',
          'auth.forgotPassword': 'Quên mật khẩu?',
          'auth.noAccount': 'Chưa có tài khoản?',
          'auth.createAccount': 'Đăng ký',
          'common.or': 'Hoặc',
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

describe('SignInScreen account-state routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('replaces the sign-in form with the dedicated restriction screen', async () => {
    jest.mocked(authApi.signIn).mockRejectedValue(
      new AppError({
        code: 'FORBIDDEN',
        message: 'Account is not active',
        businessCode: 'ACCOUNT_RESTRICTED',
        details: {
          accountStatus: 'SUSPENDED',
          restrictions: [
            {
              penaltyType: 'TEMPORARY_SUSPENSION',
              reason: 'Vi phạm quy định cộng đồng',
              endsAt: '2026-08-01T12:00:00.000Z',
            },
          ],
        },
      }),
    );
    const view = await render(<SignInScreen />);

    await fireEvent.changeText(
      view.getByLabelText('Email'),
      'test11@example.com',
    );
    await fireEvent.changeText(
      view.getByLabelText('Mật khẩu'),
      'Test11@example.com',
    );
    await fireEvent.press(view.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(public)/restriction',
        params: {
          accountStatus: 'SUSPENDED',
          penaltyType: 'TEMPORARY_SUSPENSION',
          reason: 'Vi phạm quy định cộng đồng',
          endsAt: '2026-08-01T12:00:00.000Z',
        },
      }),
    );
    expect(mockAcceptSession).not.toHaveBeenCalled();
    expect(
      view.queryByText('Bạn không có quyền thực hiện thao tác này.'),
    ).toBeNull();
  });

  it('resends the OTP and routes an unverified account to verification', async () => {
    jest.mocked(authApi.signIn).mockRejectedValue(
      new AppError({
        code: 'FORBIDDEN',
        message: 'Verify the email address before signing in',
        businessCode: 'EMAIL_VERIFICATION_REQUIRED',
      }),
    );
    jest.mocked(authApi.resend).mockResolvedValue({
      status: 'accepted',
      challengeId: 'challenge-1',
      expiresIn: 600,
      resendAfter: 60,
    });
    const view = await render(<SignInScreen />);

    await fireEvent.changeText(
      view.getByLabelText('Email'),
      'Pending@Example.com',
    );
    await fireEvent.changeText(view.getByLabelText('Mật khẩu'), 'Password123');
    await fireEvent.press(view.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() =>
      expect(authApi.resend).toHaveBeenCalledWith('pending@example.com'),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(auth)/verify-email',
      params: {
        email: 'pending@example.com',
        challengeId: 'challenge-1',
        expiresIn: '600',
        resendAfter: '60',
      },
    });
    expect(mockAcceptSession).not.toHaveBeenCalled();
  });

  it('still opens verification when the automatic resend fails', async () => {
    jest.mocked(authApi.signIn).mockRejectedValue(
      new AppError({
        code: 'FORBIDDEN',
        message: 'Verify the email address before signing in',
        businessCode: 'EMAIL_VERIFICATION_REQUIRED',
      }),
    );
    jest.mocked(authApi.resend).mockRejectedValue(
      new AppError({
        code: 'NETWORK_ERROR',
        message: 'Network request failed',
      }),
    );
    const view = await render(<SignInScreen />);

    await fireEvent.changeText(
      view.getByLabelText('Email'),
      'pending@example.com',
    );
    await fireEvent.changeText(view.getByLabelText('Mật khẩu'), 'Password123');
    await fireEvent.press(view.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(auth)/verify-email',
        params: { email: 'pending@example.com' },
      }),
    );
  });
});

import { fireEvent, waitFor } from '@testing-library/react-native';

import { authApi } from '@/features/auth/auth.api';
import { ForgotPasswordScreen } from '@/features/auth/forgot-password-screen';
import { ResetPasswordScreen } from '@/features/auth/reset-password-screen';
import { VerifyResetOtpScreen } from '@/features/auth/verify-reset-otp-screen';
import { renderWithI18n } from '../helpers/render-with-i18n';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  Link: () => null,
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('@/features/auth/auth.api', () => ({
  authApi: {
    forgotPassword: jest.fn(),
    verifyPasswordResetOtp: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

jest.mock('@/features/auth/auth-header', () => ({
  AuthHeader: () => null,
}));

describe('password reset OTP flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
  });

  it('requests an OTP and opens the dedicated six-digit OTP screen', async () => {
    jest.mocked(authApi.forgotPassword).mockResolvedValue({
      status: 'accepted',
      challengeId: '11111111-1111-4111-8111-111111111111',
      expiresIn: 600,
      resendAfter: 60,
    });
    const view = await renderWithI18n(<ForgotPasswordScreen />);

    await fireEvent.changeText(
      view.getByLabelText('Email'),
      'User@Example.com',
    );
    await fireEvent.press(view.getByRole('button', { name: 'Gửi mã OTP' }));

    await waitFor(() =>
      expect(authApi.forgotPassword).toHaveBeenCalledWith('user@example.com'),
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(auth)/verify-reset-otp',
      params: {
        email: 'user@example.com',
        challengeId: '11111111-1111-4111-8111-111111111111',
        expiresIn: '600',
        resendAfter: '60',
      },
    });
  });

  it('verifies the six-digit OTP before opening the new-password form', async () => {
    mockParams = {
      email: 'user@example.com',
      challengeId: '11111111-1111-4111-8111-111111111111',
      expiresIn: '600',
      resendAfter: '60',
    };
    jest.mocked(authApi.verifyPasswordResetOtp).mockResolvedValue({
      status: 'verified',
      resetToken: 'one-time-reset-grant-that-is-long-enough',
      expiresIn: 600,
    });
    const view = await renderWithI18n(<VerifyResetOtpScreen />);

    await fireEvent.changeText(view.getByLabelText('Chữ số OTP 1'), '123456');
    await fireEvent.press(view.getByRole('button', { name: 'Xác nhận OTP' }));

    await waitFor(() =>
      expect(authApi.verifyPasswordResetOtp).toHaveBeenCalledWith(
        '11111111-1111-4111-8111-111111111111',
        '123456',
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(auth)/reset-password',
      params: {
        email: 'user@example.com',
        resetToken: 'one-time-reset-grant-that-is-long-enough',
      },
    });
  });

  it('sets and confirms the new password, then returns to sign-in', async () => {
    mockParams = {
      email: 'user@example.com',
      resetToken: 'one-time-reset-grant-that-is-long-enough',
    };
    jest.mocked(authApi.resetPassword).mockResolvedValue({
      status: 'password_reset',
    });
    const view = await renderWithI18n(<ResetPasswordScreen />);

    await fireEvent.changeText(
      view.getByLabelText('Mật khẩu mới'),
      'NewPassword123',
    );
    await fireEvent.changeText(
      view.getByLabelText('Nhập lại mật khẩu'),
      'NewPassword123',
    );
    await fireEvent.press(
      view.getByRole('button', { name: 'Đặt lại mật khẩu' }),
    );

    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        resetToken: 'one-time-reset-grant-that-is-long-enough',
        newPassword: 'NewPassword123',
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(auth)/sign-in',
      params: {
        email: 'user@example.com',
        notice: 'password-reset-success',
      },
    });
  });
});

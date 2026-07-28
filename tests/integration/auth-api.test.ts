import { authApi } from '@/features/auth/auth.api';
import {
  authControllerForgotPassword,
  authControllerResetPassword,
  authControllerSignIn,
  authControllerSignUp,
  authControllerVerifyEmail,
  authControllerVerifyPasswordResetOtp,
} from '@/generated/api/sdk.gen';

jest.mock('@/generated/api/sdk.gen', () => ({
  authControllerForgotPassword: jest.fn(),
  authControllerResetPassword: jest.fn(),
  authControllerSignIn: jest.fn(),
  authControllerSignUp: jest.fn(),
  authControllerVerifyEmail: jest.fn(),
  authControllerVerifyPasswordResetOtp: jest.fn(),
}));
jest.mock('@/services/device-id', () => ({
  getInstallationId: jest.fn(async () => 'device-1'),
}));

describe('auth API integration adapter', () => {
  it('runs email sign-up and verify path', async () => {
    const session = {
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
    jest.mocked(authControllerSignUp).mockResolvedValue({
      data: {
        status: 'verification_required',
        challengeId: '11111111-1111-4111-8111-111111111111',
        expiresIn: 600,
        resendAfter: 60,
      },
      error: undefined,
    });
    jest.mocked(authControllerVerifyEmail).mockResolvedValue({
      data: session,
      error: undefined,
    });
    await authApi.signUp({
      email: 'user@example.com',
      password: 'StrongPassword1',
    });
    await authApi.verifyEmail('11111111-1111-4111-8111-111111111111', '123456');
    expect(authControllerVerifyEmail).toHaveBeenCalledWith({
      body: {
        challengeId: '11111111-1111-4111-8111-111111111111',
        otp: '123456',
        deviceId: 'device-1',
      },
    });
  });

  it('attaches installation id to sign-in and surfaces invalid credentials', async () => {
    jest.mocked(authControllerSignIn).mockResolvedValue({
      data: undefined,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid',
        requestId: 'r1',
      },
      response: new Response('', { status: 401 }),
    });
    await expect(
      authApi.signIn({ email: 'user@example.com', password: 'bad' }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      businessCode: 'INVALID_CREDENTIALS',
    });
    expect(authControllerSignIn).toHaveBeenCalledWith({
      body: {
        email: 'user@example.com',
        password: 'bad',
        deviceId: 'device-1',
      },
    });
  });

  it('uses the OTP challenge and one-time grant for password recovery', async () => {
    jest.mocked(authControllerForgotPassword).mockResolvedValue({
      data: {
        status: 'accepted',
        challengeId: '11111111-1111-4111-8111-111111111111',
        expiresIn: 600,
        resendAfter: 60,
      },
      error: undefined,
    });
    jest.mocked(authControllerVerifyPasswordResetOtp).mockResolvedValue({
      data: {
        status: 'verified',
        resetToken: 'one-time-reset-grant-that-is-long-enough',
        expiresIn: 600,
      },
      error: undefined,
    });
    jest.mocked(authControllerResetPassword).mockResolvedValue({
      data: { status: 'password_reset' },
      error: undefined,
    });

    await authApi.forgotPassword('user@example.com');
    await authApi.verifyPasswordResetOtp(
      '11111111-1111-4111-8111-111111111111',
      '123456',
    );
    await authApi.resetPassword({
      resetToken: 'one-time-reset-grant-that-is-long-enough',
      newPassword: 'NewPassword123',
    });

    expect(authControllerVerifyPasswordResetOtp).toHaveBeenCalledWith({
      body: {
        challengeId: '11111111-1111-4111-8111-111111111111',
        otp: '123456',
      },
    });
    expect(authControllerResetPassword).toHaveBeenCalledWith({
      body: {
        resetToken: 'one-time-reset-grant-that-is-long-enough',
        newPassword: 'NewPassword123',
      },
    });
  });
});

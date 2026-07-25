import { authApi } from '@/features/auth/auth.api';
import {
  authControllerSignIn,
  authControllerSignUp,
  authControllerVerifyEmail,
} from '@/generated/api/sdk.gen';

jest.mock('@/generated/api/sdk.gen', () => ({
  authControllerSignIn: jest.fn(),
  authControllerSignUp: jest.fn(),
  authControllerVerifyEmail: jest.fn(),
}));
jest.mock('@/services/device-id', () => ({
  getInstallationId: jest.fn(async () => 'device-1'),
}));

describe('auth API integration adapter', () => {
  it('runs email sign-up and verify path', async () => {
    jest.mocked(authControllerSignUp).mockResolvedValue({
      data: {
        userId: 'u1',
        status: 'PENDING',
        emailVerificationRequired: true,
      },
      error: undefined,
    });
    jest.mocked(authControllerVerifyEmail).mockResolvedValue({
      data: { status: 'verified' },
      error: undefined,
    });
    await authApi.signUp({
      email: 'user@example.com',
      password: 'StrongPassword1',
    });
    await authApi.verifyEmail('token');
    expect(authControllerVerifyEmail).toHaveBeenCalledWith({
      body: { token: 'token' },
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
});

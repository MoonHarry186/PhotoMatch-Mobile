import { waitFor } from '@testing-library/react-native';

import { authApi } from '@/features/auth/auth.api';
import { GoogleOAuthButton } from '@/features/auth/google-oauth-button.web';
import { renderWithI18n } from '../helpers/render-with-i18n';

const mockAcceptSession = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'https://app.photomatch.vn',
  ResponseType: { IdToken: 'id_token' },
}));

jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: () => [
    { nonce: 'google-request-nonce' },
    {
      type: 'success',
      authentication: { idToken: 'google-web-id-token' },
      params: {},
    },
    jest.fn(),
  ],
}));

jest.mock('@/config/env', () => ({
  env: {
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
  },
}));

jest.mock('@/features/auth/auth.api', () => ({
  authApi: { oauth: jest.fn() },
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: () => ({ acceptSession: mockAcceptSession }),
}));

describe('GoogleOAuthButton web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends the AuthSession nonce with the Google ID token', async () => {
    const session = { accessToken: 'access', refreshToken: 'refresh' };
    jest.mocked(authApi.oauth).mockResolvedValue(session as never);

    await renderWithI18n(<GoogleOAuthButton />);

    await waitFor(() =>
      expect(authApi.oauth).toHaveBeenCalledWith({
        provider: 'GOOGLE',
        idToken: 'google-web-id-token',
        nonce: 'google-request-nonce',
      }),
    );
    expect(mockAcceptSession).toHaveBeenCalledWith(session);
  });
});

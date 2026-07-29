import { fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithI18n } from '../helpers/render-with-i18n';

const mockAcceptSession = jest.fn();
const mockConfigure = jest.fn();
const mockHasPlayServices = jest.fn();
const mockSignIn = jest.fn();
const mockReportError = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@/config/env', () => ({
  env: {
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios-client.apps.googleusercontent.com',
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
  },
}));

jest.mock('@/features/auth/auth.api', () => ({
  authApi: { oauth: jest.fn() },
}));

jest.mock('@/core/errors', () => {
  const actual = jest.requireActual('@/core/errors');
  return { ...actual, reportError: mockReportError };
});

jest.mock('@/providers/session-provider', () => ({
  useSession: () => ({ acceptSession: mockAcceptSession }),
}));

jest.mock('@react-native-google-signin/google-signin', () => {
  return {
    GoogleSignin: {
      configure: mockConfigure,
      hasPlayServices: mockHasPlayServices,
      signIn: mockSignIn,
    },
    isCancelledResponse: (response: { type: string }) =>
      response.type === 'cancelled',
    isErrorWithCode: (error: unknown) =>
      typeof error === 'object' && error !== null && 'code' in error,
    statusCodes: {
      SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
      IN_PROGRESS: 'IN_PROGRESS',
      PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
      NULL_PRESENTER: 'NULL_PRESENTER',
    },
  };
});

const { authApi } = require('@/features/auth/auth.api');
const { GoogleOAuthButton } = require('@/features/auth/google-oauth-button');

describe('GoogleOAuthButton native', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPlayServices.mockResolvedValue(true);
  });

  it('matches the Apple button dimensions and corner radius', async () => {
    const view = await renderWithI18n(<GoogleOAuthButton />);
    const frameStyle = StyleSheet.flatten(
      view.getByTestId('google-sign-in-button').props.style,
    );

    expect(frameStyle).toMatchObject({
      width: '100%',
      height: 48,
      borderRadius: 12,
    });
    expect(view.getByText('Tiếp tục với Google')).toBeTruthy();
  });

  it('exchanges the native Google ID token for an app session', async () => {
    const session = { accessToken: 'access', refreshToken: 'refresh' };
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'google-id-token' },
    });
    jest.mocked(authApi.oauth).mockResolvedValue(session as never);
    const view = await renderWithI18n(<GoogleOAuthButton />);

    await fireEvent.press(
      view.getByRole('button', { name: 'Tiếp tục với Google' }),
    );

    await waitFor(() =>
      expect(authApi.oauth).toHaveBeenCalledWith({
        provider: 'GOOGLE',
        idToken: 'google-id-token',
      }),
    );
    expect(mockAcceptSession).toHaveBeenCalledWith(session);
    expect(mockHasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
  });

  it('does not call the backend when the user cancels', async () => {
    mockSignIn.mockResolvedValue({ type: 'cancelled', data: null });
    const view = await renderWithI18n(<GoogleOAuthButton />);

    await fireEvent.press(
      view.getByRole('button', { name: 'Tiếp tục với Google' }),
    );

    await waitFor(() => expect(mockSignIn).toHaveBeenCalled());
    expect(authApi.oauth).not.toHaveBeenCalled();
    expect(mockAcceptSession).not.toHaveBeenCalled();
  });

  it('shows the provider code and reports an Android configuration error', async () => {
    mockSignIn.mockRejectedValue(
      Object.assign(new Error('DEVELOPER_ERROR'), { code: '10' }),
    );
    const view = await renderWithI18n(<GoogleOAuthButton />);

    await fireEvent.press(
      view.getByRole('button', { name: 'Tiếp tục với Google' }),
    );

    expect(
      await view.findByText(
        'Cấu hình Google Sign-In chưa khớp với ứng dụng (mã 10).',
      ),
    ).toBeTruthy();
    expect(mockReportError).toHaveBeenCalledWith(
      expect.objectContaining({ code: '10' }),
      expect.objectContaining({
        feature: 'google_sign_in',
        providerErrorCode: '10',
      }),
    );
  });

  it('shows an unknown provider code instead of a generic error', async () => {
    mockSignIn.mockRejectedValue(
      Object.assign(new Error('Unknown native failure'), { code: '-42' }),
    );
    const view = await renderWithI18n(<GoogleOAuthButton />);

    await fireEvent.press(
      view.getByRole('button', { name: 'Tiếp tục với Google' }),
    );

    expect(
      await view.findByText('Không thể đăng nhập với Google (mã -42).'),
    ).toBeTruthy();
  });

  it('explains when Google does not return an identity token', async () => {
    mockSignIn.mockResolvedValue({
      type: 'success',
      data: { idToken: null },
    });
    const view = await renderWithI18n(<GoogleOAuthButton />);

    await fireEvent.press(
      view.getByRole('button', { name: 'Tiếp tục với Google' }),
    );

    expect(
      await view.findByText(
        'Google không trả về mã định danh. Hãy kiểm tra Web client ID.',
      ),
    ).toBeTruthy();
    expect(mockReportError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ providerErrorCode: 'missing_id_token' }),
    );
  });
});

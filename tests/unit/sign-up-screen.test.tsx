import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent } from '@testing-library/react-native';

import { AppError } from '@/core/errors';
import { authApi } from '@/features/auth/auth.api';
import { SignUpScreen } from '@/features/auth/sign-up-screen';
import { renderWithI18n } from '../helpers/render-with-i18n';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  Link: () => null,
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/features/auth/auth.api', () => ({
  authApi: { signUp: jest.fn() },
}));

jest.mock('@/features/auth/auth-header', () => ({
  AuthHeader: () => null,
}));

jest.mock('@/features/auth/legal-consent-notice', () => ({
  LegalConsentNotice: () => null,
}));

describe('SignUpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports an existing email without opening verification', async () => {
    jest.mocked(authApi.signUp).mockRejectedValue(
      new AppError({
        code: 'CONFLICT',
        message: 'An account already exists with this email',
        businessCode: 'EMAIL_ALREADY_EXISTS',
      }),
    );
    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false, gcTime: Infinity },
        queries: { gcTime: Infinity },
      },
    });
    const view = await renderWithI18n(
      <QueryClientProvider client={queryClient}>
        <SignUpScreen />
      </QueryClientProvider>,
    );

    await fireEvent.changeText(
      view.getByLabelText('Email'),
      'existing@example.com',
    );
    await fireEvent.changeText(
      view.getByLabelText('Mật khẩu'),
      'StrongPassword1',
    );
    await fireEvent.changeText(
      view.getByLabelText('Nhập lại mật khẩu'),
      'StrongPassword1',
    );
    await fireEvent.press(view.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(
      await view.findByText(
        'Email này đã tồn tại.',
      ),
    ).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

import {
  authControllerChangePendingEmail,
  authControllerForgotPassword,
  authControllerOauthSignIn,
  authControllerResend,
  authControllerResetPassword,
  authControllerSignIn,
  authControllerSignUp,
  authControllerVerifyEmail,
  catalogControllerCurrentLegal,
  profilesControllerConsent,
  profilesControllerConsents,
} from '@/generated/api/sdk.gen';
import type {
  AuthSessionResponse,
  ChangePendingEmailDto,
  ConsentResponse,
  LegalDocumentResponse,
  OAuthSignInDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
} from '@/generated/api/types.gen';
import { getInstallationId } from '@/services/device-id';
import { unwrap } from '@/services/api/result';

export const authApi = {
  async signIn(input: SignInDto): Promise<AuthSessionResponse> {
    return unwrap(
      await authControllerSignIn({
        body: { ...input, deviceId: await getInstallationId() },
      }),
    );
  },
  async oauth(
    input: Omit<OAuthSignInDto, 'deviceId'>,
  ): Promise<AuthSessionResponse> {
    return unwrap(
      await authControllerOauthSignIn({
        body: { ...input, deviceId: await getInstallationId() },
      }),
    );
  },
  async signUp(input: SignUpDto) {
    return unwrap(await authControllerSignUp({ body: input }));
  },
  async verifyEmail(token: string) {
    return unwrap(await authControllerVerifyEmail({ body: { token } }));
  },
  async resend(email: string) {
    return unwrap(await authControllerResend({ body: { email } }));
  },
  async changePendingEmail(input: ChangePendingEmailDto) {
    return unwrap(await authControllerChangePendingEmail({ body: input }));
  },
  async forgotPassword(email: string) {
    return unwrap(await authControllerForgotPassword({ body: { email } }));
  },
  async resetPassword(input: ResetPasswordDto) {
    return unwrap(await authControllerResetPassword({ body: input }));
  },
  async currentLegal(): Promise<LegalDocumentResponse[]> {
    return unwrap(await catalogControllerCurrentLegal());
  },
  async consents(): Promise<ConsentResponse[]> {
    return unwrap(await profilesControllerConsents()) as ConsentResponse[];
  },
  async consent(legalDocumentId: string): Promise<ConsentResponse> {
    return unwrap(
      await profilesControllerConsent({ body: { legalDocumentId } }),
    );
  },
};

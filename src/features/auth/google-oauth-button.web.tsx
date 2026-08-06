import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { env } from '@/config/env';
import { AppError, getUserErrorMessage } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { colors, spacing } from '@/theme';

import { authApi } from './auth.api';
import { GoogleSignInButton } from './google-sign-in-button';
import { oauthResponseOutcome } from './oauth-response';
import {
  restrictionParamsFromError,
  restrictionRoute,
} from './restriction-navigation';

function ConfiguredGoogleOAuthButton({ clientId }: { clientId: string }) {
  const { acceptSession } = useSession();
  const router = useRouter();
  const { locale, t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: clientId,
    responseType: ResponseType.IdToken,
    redirectUri: makeRedirectUri(),
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;
    const outcome = oauthResponseOutcome(response);
    if (outcome.kind === 'cancel') {
      void Promise.resolve().then(() => setLoading(false));
      return;
    }
    void Promise.resolve().then(async () => {
      if (outcome.kind === 'failure') {
        setError(t('auth.googleFailed'));
        setLoading(false);
        return;
      }
      try {
        await acceptSession(
          await authApi.oauth({
            provider: 'GOOGLE',
            idToken: outcome.idToken,
            nonce: request?.nonce,
          }),
        );
      } catch (caught) {
        const restriction =
          caught instanceof AppError
            ? restrictionParamsFromError(caught)
            : null;
        if (restriction) {
          router.replace(restrictionRoute(restriction));
          return;
        }
        setError(
          caught instanceof AppError
            ? getUserErrorMessage(caught, locale)
            : t('auth.googleFailed'),
        );
      } finally {
        setLoading(false);
      }
    });
  }, [acceptSession, locale, request?.nonce, response, router, t]);

  const openGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await promptAsync();
    } catch {
      setError(t('auth.googleOpenFailed'));
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <GoogleSignInButton
        loading={loading}
        disabled={!request}
        onPress={() => void openGoogle()}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function GoogleOAuthButton() {
  const clientId = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const { t } = useI18n();
  if (!clientId) {
    return (
      <Button
        label={t('auth.googleNotConfigured')}
        variant="secondary"
        disabled
      />
    );
  }
  return <ConfiguredGoogleOAuthButton clientId={clientId} />;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  error: { color: colors.danger, textAlign: 'center' },
});

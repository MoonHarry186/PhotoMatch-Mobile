import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { env } from '@/config/env';
import { AppError, getUserErrorMessage, reportError } from '@/core/errors';
import { useI18n, type Translate } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, spacing } from '@/theme';

import { authApi } from './auth.api';
import { GoogleSignInButton } from './google-sign-in-button';
import {
  restrictionParamsFromError,
  restrictionRoute,
} from './restriction-navigation';

const missingIdTokenMessage = 'Google did not return an identity token';

const googleConfigured = Boolean(
  env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
  (Platform.OS !== 'ios' || env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
);

if (googleConfigured) {
  GoogleSignin.configure({
    webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
}

function nativeGoogleErrorMessage(error: unknown, t: Translate): string {
  if (
    error instanceof Error &&
    error.message.toLowerCase() === missingIdTokenMessage.toLowerCase()
  ) {
    return t('auth.googleMissingToken');
  }
  if (!isErrorWithCode(error)) {
    return __DEV__ && error instanceof Error
      ? t('auth.googleDetailedError', { message: error.message })
      : t('auth.googleFailed');
  }
  const nativeMessage = error.message.toLowerCase();
  if (
    error.code === '10' ||
    nativeMessage.includes('developer_error') ||
    nativeMessage.includes('developer error')
  ) {
    return Platform.OS === 'android'
      ? t('auth.googleAndroidConfigError')
      : t('auth.googleAppConfigError');
  }
  if (
    nativeMessage.includes('url scheme') ||
    nativeMessage.includes('clientid') ||
    nativeMessage.includes('client id') ||
    nativeMessage.includes('configuration')
  ) {
    return Platform.OS === 'ios'
      ? t('auth.googleIosSchemeError', { code: error.code })
      : t('auth.googleConfigError', { code: error.code });
  }
  if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return t('auth.googlePlayServicesUnavailable');
  }
  if (error.code === statusCodes.NULL_PRESENTER) {
    return t('auth.googlePresenterUnavailable');
  }
  return t('auth.googleErrorCode', { code: error.code });
}

export function GoogleOAuthButton() {
  const { acceptSession } = useSession();
  const router = useRouter();
  const { locale, t } = useI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!googleConfigured) {
    return (
      <Button
        label={t('auth.googleNotConfigured')}
        variant="secondary"
        disabled
      />
    );
  }

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return;
      if (!response.data.idToken) {
        throw new Error(missingIdTokenMessage);
      }
      await acceptSession(
        await authApi.oauth({
          provider: 'GOOGLE',
          idToken: response.data.idToken,
        }),
      );
    } catch (caught) {
      if (
        isErrorWithCode(caught) &&
        (caught.code === statusCodes.SIGN_IN_CANCELLED ||
          caught.code === statusCodes.IN_PROGRESS)
      ) {
        return;
      }
      const restriction =
        caught instanceof AppError ? restrictionParamsFromError(caught) : null;
      if (restriction) {
        router.replace(restrictionRoute(restriction));
        return;
      }
      reportError(caught, {
        feature: 'google_sign_in',
        providerErrorCode: isErrorWithCode(caught)
          ? String(caught.code)
          : caught instanceof Error && caught.message === missingIdTokenMessage
            ? 'missing_id_token'
            : 'unknown',
        platform: Platform.OS,
      });
      setError(
        caught instanceof AppError
          ? getUserErrorMessage(caught, locale)
          : nativeGoogleErrorMessage(caught, t),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <GoogleSignInButton
        loading={loading}
        onPress={() => void signInWithGoogle()}
      />
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: palette.error }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  error: { textAlign: 'center' },
});

import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSession } from '@/providers/session-provider';
import { AppError, getUserErrorMessage } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { spacing } from '@/theme';

import { authApi } from './auth.api';
import { GoogleOAuthButton } from './google-oauth-button';
import { isOAuthCancellation } from './oauth-response';
import {
  restrictionParamsFromError,
  restrictionRoute,
} from './restriction-navigation';

export function OAuthButtons() {
  const { acceptSession } = useSession();
  const router = useRouter();
  const { locale, t } = useI18n();
  const [appleError, setAppleError] = useState<string | null>(null);
  const [appleLoading, setAppleLoading] = useState(false);

  const signInWithApple = async () => {
    setAppleError(null);
    setAppleLoading(true);
    try {
      if (!(await AppleAuthentication.isAvailableAsync())) {
        setAppleError(t('auth.appleUnavailable'));
        return;
      }
      const state = Crypto.randomUUID();
      const rawNonce = Crypto.randomUUID();
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        state,
        nonce,
      });
      if (credential.state !== state || !credential.identityToken) {
        throw new Error('Invalid Apple authentication state');
      }
      await acceptSession(
        await authApi.oauth({
          provider: 'APPLE',
          idToken: credential.identityToken,
          nonce,
        }),
      );
    } catch (caught) {
      if (isOAuthCancellation(caught)) return;
      const restriction =
        caught instanceof AppError ? restrictionParamsFromError(caught) : null;
      if (restriction) {
        router.replace(restrictionRoute(restriction));
        return;
      }
      setAppleError(
        caught instanceof AppError
          ? getUserErrorMessage(caught, locale)
          : t('auth.appleFailed'),
      );
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <GoogleOAuthButton />
      {Platform.OS === 'ios' ? (
        <View
          pointerEvents={appleLoading ? 'none' : 'auto'}
          style={styles.appleFrame}
        >
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={12}
            style={[styles.apple, appleLoading && styles.appleLoading]}
            onPress={() => void signInWithApple()}
          />
          {appleLoading ? (
            <View style={styles.appleSpinner}>
              <ActivityIndicator color="#FFFFFF" />
            </View>
          ) : null}
        </View>
      ) : null}
      {appleError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {appleError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  appleFrame: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  apple: { width: '100%', height: 48 },
  appleLoading: { opacity: 0 },
  appleSpinner: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: '#B91C1C', textAlign: 'center' },
});

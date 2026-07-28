import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { env } from '@/config/env';
import { useSession } from '@/providers/session-provider';
import { AppError, getUserErrorMessage } from '@/core/errors';
import { spacing } from '@/theme';

import { authApi } from './auth.api';
import { isOAuthCancellation, oauthResponseOutcome } from './oauth-response';
import {
  restrictionParamsFromError,
  restrictionRoute,
} from './restriction-navigation';

function GoogleOAuthButton() {
  const { acceptSession } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    responseType: ResponseType.IdToken,
    redirectUri: makeRedirectUri(),
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (!response) return;
    const outcome = oauthResponseOutcome(response);
    if (outcome.kind === 'cancel') return;
    void Promise.resolve().then(async () => {
      if (outcome.kind === 'failure') {
        setError('Không thể đăng nhập với Google.');
        return;
      }
      setLoading(true);
      try {
        await acceptSession(
          await authApi.oauth({
            provider: 'GOOGLE',
            idToken: outcome.idToken,
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
            ? getUserErrorMessage(caught)
            : 'Không thể đăng nhập với Google.',
        );
      } finally {
        setLoading(false);
      }
    });
  }, [acceptSession, response, router]);

  return (
    <>
      <Button
        label="Tiếp tục với Google"
        variant="secondary"
        loading={loading}
        disabled={!request}
        onPress={() => void promptAsync()}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </>
  );
}

export function OAuthButtons() {
  const { acceptSession } = useSession();
  const router = useRouter();
  const [appleError, setAppleError] = useState<string | null>(null);
  const [appleLoading, setAppleLoading] = useState(false);
  const googleConfigured = Boolean(
    Platform.select({
      ios: env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      android: env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      default: env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    }),
  );

  const signInWithApple = async () => {
    setAppleError(null);
    setAppleLoading(true);
    try {
      if (!(await AppleAuthentication.isAvailableAsync())) {
        setAppleError('Đăng nhập Apple không khả dụng trên thiết bị này.');
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
          ? getUserErrorMessage(caught)
          : 'Không thể đăng nhập với Apple.',
      );
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {googleConfigured ? (
        <GoogleOAuthButton />
      ) : (
        <Button
          label="Google chưa được cấu hình"
          variant="secondary"
          disabled
        />
      )}
      {Platform.OS === 'ios' ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={
            AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
          }
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={styles.apple}
          onPress={() => void signInWithApple()}
        />
      ) : null}
      {appleLoading ? <Text>Đang xác thực với Apple…</Text> : null}
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
  apple: { width: '100%', height: 48 },
  error: { color: '#B91C1C', textAlign: 'center' },
});

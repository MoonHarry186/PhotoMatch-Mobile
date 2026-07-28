import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';
import { useEffect } from 'react';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { AppError, getUserErrorMessage } from '@/core/errors';
import { spacing } from '@/theme';
import { useSession } from '@/providers/session-provider';
import { useI18n } from '@/i18n/i18n-provider';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { LegalConsentNotice } from './legal-consent-notice';
import { OAuthButtons } from './oauth-buttons';
import {
  restrictionParamsFromError,
  restrictionRoute,
} from './restriction-navigation';
import { signInSchema } from './auth.schemas';

type Form = z.infer<typeof signInSchema>;

export function SignInScreen() {
  const session = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; notice?: string }>();
  const { t } = useI18n();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: params.email ?? '', password: '' },
  });

  useEffect(() => {
    if (session.status === 'ready' && session.snapshot) {
      router.replace('/');
    }
  }, [router, session.snapshot, session.status]);

  const submit = handleSubmit(async (value) => {
    try {
      await session.acceptSession(await authApi.signIn(value));
    } catch (caught) {
      const error = caught instanceof AppError ? caught : null;
      if (error?.businessCode === 'EMAIL_VERIFICATION_REQUIRED') {
        try {
          const challenge = await authApi.resend(value.email);
          router.replace({
            pathname: '/(auth)/verify-email',
            params: {
              email: value.email,
              challengeId: challenge.challengeId,
              expiresIn: String(challenge.expiresIn),
              resendAfter: String(challenge.resendAfter),
            },
          });
        } catch {
          router.replace({
            pathname: '/(auth)/verify-email',
            params: { email: value.email },
          });
        }
        return;
      }
      const restriction = error ? restrictionParamsFromError(error) : null;
      if (restriction) {
        router.replace(restrictionRoute(restriction));
        return;
      }
      setError('root', {
        message:
          error?.businessCode === 'INVALID_CREDENTIALS'
            ? 'Email hoặc mật khẩu không đúng.'
            : error
              ? getUserErrorMessage(error)
              : 'Không thể đăng nhập.',
      });
    }
  });

  return (
    <AppScreen testID="sign-in-screen">
      <AuthHeader
        title="Chào mừng trở lại"
        subtitle="Kết nối với nhiếp ảnh gia phù hợp"
      />
      {params.notice === 'password-reset-success' ? (
        <Text accessibilityRole="alert" style={styles.success}>
          Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
        </Text>
      ) : null}
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label={t('auth.email')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('auth.password')}
            autoComplete="current-password"
            secureTextEntry
            secureToggle
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={errors.password?.message}
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      {errors.root?.message ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {errors.root.message}
        </Text>
      ) : null}
      <Button
        label={t('auth.signIn')}
        loading={isSubmitting}
        onPress={() => void submit()}
      />
      <View style={styles.links}>
        <Link href="/(auth)/forgot-password">{t('auth.forgotPassword')}</Link>
        <Link href="/(auth)/sign-up">{t('auth.createAccount')}</Link>
      </View>
      <OAuthButtons />
      <LegalConsentNotice action="sign-in" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: '#B91C1C', textAlign: 'center' },
  success: { color: '#15803D', textAlign: 'center' },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});

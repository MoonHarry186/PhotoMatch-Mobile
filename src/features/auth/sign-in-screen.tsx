import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';
import { useEffect, useMemo } from 'react';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { AppError, getUserErrorMessage } from '@/core/errors';
import { colors, spacing, typography } from '@/theme';
import { useSession } from '@/providers/session-provider';
import { useOptionalTheme } from '@/providers/theme-provider';
import { useI18n } from '@/i18n/i18n-provider';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { LegalConsentNotice } from './legal-consent-notice';
import { OAuthButtons } from './oauth-buttons';
import {
  restrictionParamsFromError,
  restrictionRoute,
} from './restriction-navigation';
import { createSignInSchema } from './auth.schemas';

type Form = z.infer<ReturnType<typeof createSignInSchema>>;

export function SignInScreen() {
  const session = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; notice?: string }>();
  const { locale, t } = useI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const schema = useMemo(() => createSignInSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
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
            ? t('auth.invalidCredentials')
            : error
              ? getUserErrorMessage(error, locale)
              : t('auth.signInFailed'),
      });
    }
  });

  return (
    <AppScreen testID="sign-in-screen">
      <AuthHeader
        title={t('auth.welcomeBack')}
        subtitle={t('auth.signInSubtitle')}
      />
      {params.notice === 'password-reset-success' ? (
        <Text
          accessibilityRole="alert"
          style={[styles.success, { color: palette.success }]}
        >
          {t('auth.passwordResetSuccess')}
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
            placeholder={t('auth.emailPlaceholder')}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label={t('auth.password')}
            labelAccessory={
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable
                  hitSlop={8}
                  testID="forgot-password-link"
                  style={({ pressed }) => pressed && styles.linkPressed}
                >
                  <Text style={styles.forgotPassword}>
                    {t('auth.forgotPassword')}
                  </Text>
                </Pressable>
              </Link>
            }
            autoComplete="current-password"
            secureTextEntry
            secureToggle
            showPasswordLabel={t('auth.showPassword')}
            hidePasswordLabel={t('auth.hidePassword')}
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={errors.password?.message}
            placeholder={t('auth.passwordPlaceholder')}
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      {errors.root?.message ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: palette.error }]}
        >
          {errors.root.message}
        </Text>
      ) : null}
      <Button
        label={t('auth.signIn')}
        loading={isSubmitting}
        onPress={() => void submit()}
      />
      <View style={styles.createAccountRow}>
        <Text style={[styles.createAccountPrompt, { color: palette.text }]}>
          {t('auth.noAccount')}
        </Text>
        <Link href="/(auth)/sign-up" asChild>
          <Pressable
            hitSlop={8}
            testID="create-account-link"
            style={({ pressed }) => pressed && styles.linkPressed}
          >
            <Text style={styles.createAccount}>{t('auth.createAccount')}</Text>
          </Pressable>
        </Link>
      </View>
      <View accessibilityRole="text" style={styles.divider}>
        <View
          style={[styles.dividerLine, { backgroundColor: palette.border }]}
        />
        <Text style={[styles.dividerText, { color: palette.muted }]}>
          {t('common.or')}
        </Text>
        <View
          style={[styles.dividerLine, { backgroundColor: palette.border }]}
        />
      </View>
      <OAuthButtons />
      <LegalConsentNotice action="sign-in" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: { textAlign: 'center' },
  success: { textAlign: 'center' },
  forgotPassword: {
    color: colors.link,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  createAccountRow: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  createAccountPrompt: {
    fontFamily: typography.regular,
    fontSize: 14,
  },
  createAccount: {
    color: colors.link,
    fontFamily: typography.semibold,
    fontSize: 14,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontFamily: typography.medium,
    fontSize: 14,
  },
  linkPressed: { opacity: 0.68 },
});

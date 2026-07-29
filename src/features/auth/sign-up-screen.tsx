import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';
import { useMemo } from 'react';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import {
  applyServerFieldErrors,
  getUserErrorMessage,
  normalizeError,
} from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { colors, spacing, typography } from '@/theme';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { LegalConsentNotice } from './legal-consent-notice';
import { createSignUpSchema } from './auth.schemas';

type Form = z.infer<ReturnType<typeof createSignUpSchema>>;

export function SignUpScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const schema = useMemo(() => createSignUpSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });
  const signUp = useMutation({ mutationFn: authApi.signUp });
  const submit = handleSubmit(async ({ email, password }) => {
    try {
      const challenge = await signUp.mutateAsync({ email, password });
      router.replace({
        pathname: '/(auth)/verify-email',
        params: {
          email,
          challengeId: challenge.challengeId,
          expiresIn: String(challenge.expiresIn),
          resendAfter: String(challenge.resendAfter),
        },
      });
    } catch (caught) {
      const error = normalizeError(caught);
      if (error.businessCode === 'EMAIL_ALREADY_EXISTS') {
        setError(
          'email',
          { message: t('auth.emailAlreadyExists') },
          { shouldFocus: true },
        );
        return;
      }
      let shouldFocus = true;
      applyServerFieldErrors(error.fieldErrors, (field, message) => {
        if (
          field === 'email' ||
          field === 'password' ||
          field === 'confirmPassword'
        ) {
          setError(field, { message }, { shouldFocus });
          shouldFocus = false;
        }
      });
      setError('root', {
        message: getUserErrorMessage(error, locale),
      });
    }
  });

  return (
    <AppScreen>
      <AuthHeader title={t('auth.signUp')} />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            ref={field.ref}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
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
            secureTextEntry
            secureToggle
            showPasswordLabel={t('auth.showPassword')}
            hidePasswordLabel={t('auth.hidePassword')}
            value={field.value}
            ref={field.ref}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
            placeholder={t('auth.passwordPlaceholder')}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <TextField
            label={t('auth.confirmPassword')}
            secureTextEntry
            secureToggle
            showPasswordLabel={t('auth.showPassword')}
            hidePasswordLabel={t('auth.hidePassword')}
            value={field.value}
            ref={field.ref}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmPassword?.message}
            placeholder={t('auth.confirmPasswordPlaceholder')}
          />
        )}
      />
      {errors.root?.message ? (
        <Text style={styles.error}>{errors.root.message}</Text>
      ) : null}
      <Button
        label={t('auth.signUp')}
        loading={isSubmitting || signUp.isPending}
        onPress={() => void submit()}
      />
      <View style={styles.accountRow}>
        <Text style={styles.accountPrompt}>{t('auth.alreadyHaveAccount')}</Text>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable
            testID="sign-in-link"
            style={({ pressed }) => [
              styles.accountLink,
              pressed && styles.linkPressed,
            ]}
          >
            <Text style={styles.linkText}>{t('auth.signIn')}</Text>
          </Pressable>
        </Link>
      </View>
      <LegalConsentNotice action="sign-up" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: '#B91C1C' },
  accountRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  accountPrompt: {
    color: colors.light.text,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  accountLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    color: colors.link,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  linkPressed: { opacity: 0.68 },
});

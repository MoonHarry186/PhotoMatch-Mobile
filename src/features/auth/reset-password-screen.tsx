import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import type { z } from 'zod';
import { useMemo } from 'react';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { AppError, getUserErrorMessage } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { createResetPasswordSchema } from './auth.schemas';

type Form = z.infer<ReturnType<typeof createResetPasswordSchema>>;

export function ResetPasswordScreen() {
  const { email = '', resetToken = '' } = useLocalSearchParams<{
    email?: string;
    resetToken?: string;
  }>();
  const router = useRouter();
  const { locale, t } = useI18n();
  const schema = useMemo(() => createResetPasswordSchema(t), [t]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { resetToken, newPassword: '', confirmPassword: '' },
  });
  const submit = handleSubmit(async (value) => {
    try {
      await authApi.resetPassword({
        resetToken: value.resetToken,
        newPassword: value.newPassword,
      });
      router.replace({
        pathname: '/(auth)/sign-in',
        params: { email, notice: 'password-reset-success' },
      });
    } catch (caught) {
      const error = caught instanceof AppError ? caught : null;
      setError('root', {
        message:
          error?.businessCode === 'TOKEN_INVALID' ||
          error?.businessCode === 'TOKEN_EXPIRED' ||
          error?.businessCode === 'RESET_TOKEN_INVALID'
            ? t('auth.resetSessionInvalid')
            : error
              ? getUserErrorMessage(error, locale)
              : t('auth.resetPasswordFailed'),
      });
    }
  });
  return (
    <AppScreen>
      <AuthHeader title={t('auth.resetPasswordTitle')} />
      {(['newPassword', 'confirmPassword'] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <TextField
              label={
                name === 'newPassword'
                  ? t('auth.newPassword')
                  : t('auth.confirmPassword')
              }
              placeholder={
                name === 'newPassword'
                  ? t('auth.newPasswordPlaceholder')
                  : t('auth.confirmPasswordPlaceholder')
              }
              secureTextEntry
              secureToggle
              showPasswordLabel={t('auth.showPassword')}
              hidePasswordLabel={t('auth.hidePassword')}
              value={field.value}
              onChangeText={field.onChange}
              error={errors[name]?.message}
            />
          )}
        />
      ))}
      {errors.root?.message ? (
        <Text accessibilityRole="alert">{errors.root.message}</Text>
      ) : null}
      <Button
        label={t('auth.resetPassword')}
        loading={isSubmitting}
        disabled={!resetToken}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}

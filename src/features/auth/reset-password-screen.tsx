import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import type { z } from 'zod';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { AppError, getUserErrorMessage } from '@/core/errors';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { resetPasswordSchema } from './auth.schemas';

type Form = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordScreen() {
  const { email = '', resetToken = '' } = useLocalSearchParams<{
    email?: string;
    resetToken?: string;
  }>();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(resetPasswordSchema),
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
            ? 'Phiên đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.'
            : error
              ? getUserErrorMessage(error)
              : 'Không thể đặt lại mật khẩu.',
      });
    }
  });
  return (
    <AppScreen>
      <AuthHeader title="Mật khẩu mới" />
      {(['newPassword', 'confirmPassword'] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <TextField
              label={
                name === 'newPassword' ? 'Mật khẩu mới' : 'Nhập lại mật khẩu'
              }
              secureTextEntry
              secureToggle
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
        label="Đặt lại mật khẩu"
        loading={isSubmitting}
        disabled={!resetToken}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}

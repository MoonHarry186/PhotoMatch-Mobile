import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import type { z } from 'zod';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { ApiError } from '@/services/api/api-error';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { resetPasswordSchema } from './auth.schemas';

type Form = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordScreen() {
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  });
  const submit = handleSubmit(async ({ token: resetToken, newPassword }) => {
    try {
      await authApi.resetPassword({ token: resetToken, newPassword });
      router.replace('/(auth)/sign-in');
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : null;
      setError('root', {
        message:
          error?.code === 'TOKEN_INVALID' || error?.code === 'TOKEN_EXPIRED'
            ? 'Liên kết đặt lại đã hết hạn hoặc đã được sử dụng.'
            : (error?.message ?? 'Không thể đặt lại mật khẩu.'),
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
        disabled={!token}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}

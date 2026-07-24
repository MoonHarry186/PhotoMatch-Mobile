import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';
import type { z } from 'zod';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { ApiError, fieldErrors } from '@/services/api/api-error';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { changePendingEmailSchema } from './auth.schemas';

type Form = z.infer<typeof changePendingEmailSchema>;

export function ChangePendingEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(changePendingEmailSchema),
    defaultValues: {
      currentEmail: params.email ?? '',
      newEmail: '',
      password: '',
    },
  });
  const submit = handleSubmit(async (value) => {
    try {
      await authApi.changePendingEmail(value);
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: value.newEmail },
      });
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : null;
      for (const [name, message] of Object.entries(
        error ? fieldErrors(error) : {},
      )) {
        if (
          name === 'currentEmail' ||
          name === 'newEmail' ||
          name === 'password'
        ) {
          setError(name, { message });
        }
      }
      setError('root', { message: error?.message ?? 'Không thể đổi email.' });
    }
  });
  return (
    <AppScreen>
      <AuthHeader
        title="Đổi email"
        subtitle="Liên kết xác minh cũ sẽ không còn hiệu lực."
      />
      {(['currentEmail', 'newEmail', 'password'] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <TextField
              label={
                name === 'currentEmail'
                  ? 'Email hiện tại'
                  : name === 'newEmail'
                    ? 'Email mới'
                    : 'Mật khẩu'
              }
              secureTextEntry={name === 'password'}
              secureToggle={name === 'password'}
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={errors[name]?.message}
            />
          )}
        />
      ))}
      {errors.root?.message ? (
        <Text accessibilityRole="alert">{errors.root.message}</Text>
      ) : null}
      <Button
        label="Cập nhật email"
        loading={isSubmitting}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}

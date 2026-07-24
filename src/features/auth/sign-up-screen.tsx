import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { ApiError } from '@/services/api/api-error';
import { spacing } from '@/theme';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { signUpSchema } from './auth.schemas';

type Form = z.infer<typeof signUpSchema>;

export function SignUpScreen() {
  const router = useRouter();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      acceptedLegal: false as never,
    },
  });
  const submit = handleSubmit(async ({ email, password }) => {
    try {
      await authApi.signUp({ email, password });
      router.replace({ pathname: '/(auth)/verify-email', params: { email } });
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : null;
      setError('root', {
        message: error?.message ?? 'Không thể tạo tài khoản.',
      });
    }
  });

  return (
    <AppScreen>
      <AuthHeader title="Tạo tài khoản" />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Mật khẩu"
            secureTextEntry
            secureToggle
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.password?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <TextField
            label="Nhập lại mật khẩu"
            secureTextEntry
            secureToggle
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmPassword?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="acceptedLegal"
        render={({ field }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: field.value }}
            onPress={() => field.onChange(!field.value)}
            style={styles.consent}
          >
            <Text>{field.value ? '☑' : '☐'}</Text>
            <Text style={styles.consentText}>
              Tôi đồng ý rõ ràng với{' '}
              <Link href="/(public)/legal/terms">Điều khoản</Link> và{' '}
              <Link href="/(public)/legal/privacy">
                Chính sách quyền riêng tư
              </Link>{' '}
              hiện hành.
            </Text>
          </Pressable>
        )}
      />
      {errors.acceptedLegal?.message ? (
        <Text style={styles.error}>{errors.acceptedLegal.message}</Text>
      ) : null}
      {errors.root?.message ? (
        <Text style={styles.error}>{errors.root.message}</Text>
      ) : null}
      <Button
        label="Tạo tài khoản"
        loading={isSubmitting}
        onPress={() => void submit()}
      />
      <View style={styles.center}>
        <Link href="/(auth)/sign-in">Đã có tài khoản? Đăng nhập</Link>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minHeight: 44,
  },
  consentText: { flex: 1, lineHeight: 22 },
  error: { color: '#B91C1C' },
  center: { alignItems: 'center' },
});

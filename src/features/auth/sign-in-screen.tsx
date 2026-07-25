import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { AppError, getUserErrorMessage } from '@/core/errors';
import { spacing } from '@/theme';
import { useSession } from '@/providers/session-provider';
import { useI18n } from '@/i18n/i18n-provider';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { OAuthButtons } from './oauth-buttons';
import { signInSchema } from './auth.schemas';

type Form = z.infer<typeof signInSchema>;

export function SignInScreen() {
  const session = useSession();
  const { t } = useI18n();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit(async (value) => {
    try {
      await session.acceptSession(await authApi.signIn(value));
    } catch (caught) {
      const error = caught instanceof AppError ? caught : null;
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: '#B91C1C', textAlign: 'center' },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});

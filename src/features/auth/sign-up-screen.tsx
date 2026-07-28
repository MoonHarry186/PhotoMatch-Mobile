import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import type { z } from 'zod';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import {
  applyServerFieldErrors,
  getUserErrorMessage,
  normalizeError,
} from '@/core/errors';
import { colors } from '@/theme';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { LegalConsentNotice } from './legal-consent-notice';
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
        message: getUserErrorMessage(error),
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
            ref={field.ref}
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
            ref={field.ref}
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
            ref={field.ref}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmPassword?.message}
          />
        )}
      />
      {errors.root?.message ? (
        <Text style={styles.error}>{errors.root.message}</Text>
      ) : null}
      <Button
        label="Tạo tài khoản"
        loading={isSubmitting || signUp.isPending}
        onPress={() => void submit()}
      />
      <View style={styles.center}>
        <Link href="/(auth)/sign-in">
          Đã có tài khoản? <Text style={styles.linkColor}>Đăng nhập</Text>
        </Link>
      </View>
      <LegalConsentNotice action="sign-up" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  error: { color: '#B91C1C' },
  center: { alignItems: 'center' },
  linkColor: { color: colors.link },
});

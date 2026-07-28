import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { spacing } from '@/theme';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { emailSchema } from './auth.schemas';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Email không hợp lệ.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const challenge = await authApi.forgotPassword(parsed.data);
      router.push({
        pathname: '/(auth)/verify-reset-otp',
        params: {
          email: parsed.data,
          challengeId: challenge.challengeId,
          expiresIn: String(challenge.expiresIn),
          resendAfter: String(challenge.resendAfter),
        },
      });
    } catch {
      setMessage('Chưa thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen testID="forgot-password-screen">
      <AuthHeader
        title="Quên mật khẩu"
        subtitle="Nhập email đã đăng ký để nhận mã OTP 6 số."
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setMessage(null);
        }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={message ?? undefined}
        onSubmitEditing={() => void submit()}
      />
      <Button
        label="Gửi mã OTP"
        loading={busy}
        disabled={busy || !email.trim()}
        onPress={() => void submit()}
      />
      <View style={styles.center}>
        <Link href="/(auth)/sign-in">Quay lại đăng nhập</Link>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', marginTop: spacing.sm },
});

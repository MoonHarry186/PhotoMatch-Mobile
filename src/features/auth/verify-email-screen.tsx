import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { AppError, getUserErrorMessage } from '@/core/errors';
import { spacing } from '@/theme';
import { useSession } from '@/providers/session-provider';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';

const RESEND_SECONDS = 60;

export function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const router = useRouter();
  const session = useSession();
  const [email, setEmail] = useState(params.email ?? '');
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(Boolean(params.token));

  useEffect(() => {
    if (!params.token) return;
    void authApi
      .verifyEmail(params.token)
      .then(async () => {
        setMessage('Email đã được xác minh. Bạn có thể đăng nhập.');
        await session.reload();
        router.replace('/');
      })
      .catch((caught: unknown) =>
        setMessage(
          caught instanceof AppError
            ? getUserErrorMessage(caught)
            : 'Liên kết xác minh đã hết hạn hoặc không hợp lệ.',
        ),
      )
      .finally(() => setBusy(false));
  }, [params.token, router, session]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(
      () => setSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearInterval(timer);
  }, [seconds]);

  const resendLabel = useMemo(
    () => (seconds ? `Gửi lại sau ${seconds}s` : 'Gửi lại email xác minh'),
    [seconds],
  );

  return (
    <AppScreen>
      <AuthHeader
        title="Xác minh email"
        subtitle="Mở liên kết trong email để tiếp tục. Bạn có thể quay lại app sau khi xác minh."
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      {message ? (
        <Text accessibilityRole="alert" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <Button
        label={resendLabel}
        loading={busy}
        disabled={seconds > 0 || !email}
        onPress={() => {
          setBusy(true);
          void authApi
            .resend(email)
            .then(() => {
              setSeconds(RESEND_SECONDS);
              setMessage(
                'Nếu tài khoản đang chờ xác minh, email mới đã được gửi.',
              );
            })
            .catch(() => setMessage('Chưa thể gửi lại. Vui lòng thử sau.'))
            .finally(() => setBusy(false));
        }}
      />
      <Button
        label="Đổi email đang chờ"
        variant="ghost"
        onPress={() =>
          router.push({
            pathname: '/(auth)/change-pending-email',
            params: { email },
          })
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  message: { textAlign: 'center', marginVertical: spacing.sm },
});

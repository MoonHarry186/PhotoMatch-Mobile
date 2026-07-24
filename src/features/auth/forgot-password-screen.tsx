import { Link } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <AppScreen>
      <AuthHeader title="Đặt lại mật khẩu" />
      {sent ? (
        <>
          <Text>
            Nếu email tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi. Hãy kiểm
            tra cả thư rác.
          </Text>
          <Link href="/(auth)/sign-in">Quay lại đăng nhập</Link>
        </>
      ) : (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button
            label="Gửi hướng dẫn"
            loading={busy}
            disabled={!email}
            onPress={() => {
              setBusy(true);
              void authApi
                .forgotPassword(email)
                .catch(() => undefined)
                .finally(() => {
                  setBusy(false);
                  setSent(true);
                });
            }}
          />
        </>
      )}
    </AppScreen>
  );
}

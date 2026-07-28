import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { normalizeError } from '@/core/errors';
import { colors, spacing, typography } from '@/theme';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { verificationOtpSchema } from './auth.schemas';
import { OtpInput } from './otp-input';

type ResetOtpParams = {
  email?: string;
  challengeId?: string;
  expiresIn?: string;
  resendAfter?: string;
};

export function VerifyResetOtpScreen() {
  const params = useLocalSearchParams<ResetOtpParams>();
  const router = useRouter();
  const email = params.email ?? '';
  const [challengeId, setChallengeId] = useState(params.challengeId ?? '');
  const [otp, setOtp] = useState('');
  const [expiresIn, setExpiresIn] = useState(() =>
    secondsFromParam(params.expiresIn),
  );
  const [resendAfter, setResendAfter] = useState(() =>
    secondsFromParam(params.resendAfter),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (expiresIn <= 0 && resendAfter <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn((value) => Math.max(0, value - 1));
      setResendAfter((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresIn, resendAfter]);

  const expiryLabel = useMemo(() => {
    if (!challengeId) return 'Vui lòng quay lại và yêu cầu mã OTP.';
    if (expiresIn <= 0) return 'Mã OTP đã hết hạn. Vui lòng gửi mã mới.';
    const minutes = Math.floor(expiresIn / 60);
    const seconds = String(expiresIn % 60).padStart(2, '0');
    return `Mã có hiệu lực trong ${minutes}:${seconds}`;
  }, [challengeId, expiresIn]);

  const verify = async () => {
    const parsed = verificationOtpSchema.safeParse(otp);
    if (!challengeId) {
      setMessage('Vui lòng gửi mã OTP mới.');
      return;
    }
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Mã OTP chưa hợp lệ.');
      return;
    }
    if (expiresIn <= 0) {
      setMessage('Mã OTP đã hết hạn. Vui lòng gửi mã mới.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const verified = await authApi.verifyPasswordResetOtp(
        challengeId,
        parsed.data,
      );
      router.replace({
        pathname: '/(auth)/reset-password',
        params: { email, resetToken: verified.resetToken },
      });
    } catch (caught) {
      const error = normalizeError(caught);
      if (error.businessCode === 'PASSWORD_RESET_CODE_INVALID') {
        setMessage('Mã OTP không đúng. Vui lòng kiểm tra lại.');
      } else if (error.businessCode === 'PASSWORD_RESET_CODE_EXPIRED') {
        setExpiresIn(0);
        setMessage('Mã OTP đã hết hạn. Vui lòng gửi mã mới.');
      } else if (error.businessCode === 'PASSWORD_RESET_ATTEMPTS_EXCEEDED') {
        setResendAfter(0);
        setMessage('Bạn đã nhập sai quá số lần cho phép. Hãy gửi mã mới.');
      } else {
        setMessage('Chưa thể xác minh mã OTP. Vui lòng thử lại.');
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const challenge = await authApi.forgotPassword(email);
      setChallengeId(challenge.challengeId);
      setExpiresIn(challenge.expiresIn);
      setResendAfter(challenge.resendAfter);
      setOtp('');
      setMessage('Nếu email đã đăng ký, mã OTP mới đã được gửi.');
    } catch {
      setMessage('Chưa thể gửi mã mới. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen testID="verify-reset-otp-screen">
      <AuthHeader
        title="Nhập mã OTP"
        subtitle={`Nhập mã OTP 6 số đã gửi đến ${email || 'email của bạn'}.`}
      />
      <View style={styles.otpSection}>
        <Text style={styles.otpLabel}>Mã xác minh</Text>
        <OtpInput
          value={otp}
          onChange={(value) => {
            setOtp(value);
            setMessage(null);
          }}
          disabled={busy}
          hasError={Boolean(message)}
        />
      </View>
      <Text style={styles.hint}>{expiryLabel}</Text>
      {message ? (
        <Text accessibilityRole="alert" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <Button
        label="Xác nhận OTP"
        loading={busy}
        disabled={busy || otp.length !== 6 || !challengeId || expiresIn <= 0}
        onPress={() => void verify()}
      />
      <Button
        label={
          resendAfter > 0 ? `Gửi lại mã sau ${resendAfter}s` : 'Gửi lại mã OTP'
        }
        variant="ghost"
        disabled={busy || resendAfter > 0 || !email}
        onPress={() => void resend()}
      />
    </AppScreen>
  );
}

function secondsFromParam(value?: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

const styles = StyleSheet.create({
  otpSection: { gap: spacing.sm },
  otpLabel: {
    color: colors.light.text,
    fontFamily: typography.semibold,
    fontSize: 14,
    textAlign: 'center',
  },
  hint: { textAlign: 'center', marginTop: spacing.xs },
  message: { color: '#B91C1C', textAlign: 'center' },
});

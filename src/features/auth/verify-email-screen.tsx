import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { normalizeError } from '@/core/errors';
import { useSession } from '@/providers/session-provider';
import { colors, spacing, typography } from '@/theme';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { verificationOtpSchema } from './auth.schemas';
import { OtpInput } from './otp-input';

type VerificationParams = {
  email?: string;
  challengeId?: string;
  expiresIn?: string;
  resendAfter?: string;
};

export function VerifyEmailScreen() {
  const params = useLocalSearchParams<VerificationParams>();
  const router = useRouter();
  const session = useSession();
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
    if (!challengeId) return 'Gửi mã OTP để bắt đầu xác minh.';
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
      const authenticated = await authApi.verifyEmail(challengeId, parsed.data);
      await session.acceptSession(authenticated);
      router.replace('/');
    } catch (caught) {
      const error = normalizeError(caught);
      if (error.businessCode === 'VERIFICATION_CODE_INVALID') {
        setMessage('Mã OTP không đúng. Vui lòng kiểm tra lại.');
      } else if (error.businessCode === 'VERIFICATION_CODE_EXPIRED') {
        setExpiresIn(0);
        setMessage('Mã OTP đã hết hạn. Vui lòng gửi mã mới.');
      } else if (error.businessCode === 'VERIFICATION_ATTEMPTS_EXCEEDED') {
        setResendAfter(0);
        setMessage('Bạn đã nhập sai quá số lần cho phép. Hãy gửi mã mới.');
      } else {
        setMessage('Chưa thể xác minh email. Vui lòng thử lại.');
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const challenge = await authApi.resend(email);
      setChallengeId(challenge.challengeId);
      setExpiresIn(challenge.expiresIn);
      setResendAfter(challenge.resendAfter);
      setOtp('');
      setMessage('Nếu tài khoản đang chờ xác minh, mã OTP đã được gửi.');
    } catch {
      setMessage('Chưa thể gửi mã mới. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen testID="verify-email-screen">
      <AuthHeader
        title="Xác minh email"
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
        label="Xác minh"
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

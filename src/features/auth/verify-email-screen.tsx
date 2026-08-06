import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button } from '@/components/ui';
import { normalizeError } from '@/core/errors';
import { useI18n } from '@/i18n/i18n-provider';
import { useSession } from '@/providers/session-provider';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, spacing, typography } from '@/theme';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { createVerificationOtpSchema } from './auth.schemas';
import { OtpInput } from './otp-input';

type VerificationParams = {
  email?: string;
  challengeId?: string;
  expiresIn?: string;
  resendAfter?: string;
};

type Feedback = {
  text: string;
  tone: 'error';
};

export function VerifyEmailScreen() {
  const params = useLocalSearchParams<VerificationParams>();
  const router = useRouter();
  const session = useSession();
  const { t } = useI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const verificationOtpSchema = useMemo(
    () => createVerificationOtpSchema(t),
    [t],
  );
  const email = params.email ?? '';
  const [challengeId, setChallengeId] = useState(params.challengeId ?? '');
  const [otp, setOtp] = useState('');
  const [expiresIn, setExpiresIn] = useState(() =>
    secondsFromParam(params.expiresIn),
  );
  const [resendAfter, setResendAfter] = useState(() =>
    secondsFromParam(params.resendAfter),
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
    if (!challengeId) return t('auth.otpStartVerification');
    if (expiresIn <= 0) return t('auth.otpExpired');
    const minutes = Math.floor(expiresIn / 60);
    const seconds = String(expiresIn % 60).padStart(2, '0');
    return t('auth.otpValidFor', { time: `${minutes}:${seconds}` });
  }, [challengeId, expiresIn, t]);

  const verify = async () => {
    const parsed = verificationOtpSchema.safeParse(otp);
    if (!challengeId) {
      setFeedback({ text: t('auth.otpRequestNew'), tone: 'error' });
      return;
    }
    if (!parsed.success) {
      setFeedback({
        text: parsed.error.issues[0]?.message ?? t('auth.otpInvalid'),
        tone: 'error',
      });
      return;
    }
    if (expiresIn <= 0) {
      setFeedback({ text: t('auth.otpExpired'), tone: 'error' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const authenticated = await authApi.verifyEmail(challengeId, parsed.data);
      await session.acceptSession(authenticated);
      router.replace('/');
    } catch (caught) {
      const error = normalizeError(caught);
      if (error.businessCode === 'VERIFICATION_CODE_INVALID') {
        setFeedback({ text: t('auth.otpIncorrect'), tone: 'error' });
      } else if (error.businessCode === 'VERIFICATION_CODE_EXPIRED') {
        setExpiresIn(0);
        setFeedback({ text: t('auth.otpExpired'), tone: 'error' });
      } else if (error.businessCode === 'VERIFICATION_ATTEMPTS_EXCEEDED') {
        setResendAfter(0);
        setFeedback({
          text: t('auth.otpAttemptsExceeded'),
          tone: 'error',
        });
      } else {
        setFeedback({ text: t('auth.verifyEmailFailed'), tone: 'error' });
      }
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const challenge = await authApi.resend(email);
      setChallengeId(challenge.challengeId);
      setExpiresIn(challenge.expiresIn);
      setResendAfter(challenge.resendAfter);
      setOtp('');
    } catch {
      setFeedback({ text: t('auth.resendOtpFailed'), tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen testID="verify-email-screen">
      <AuthHeader
        title={t('auth.verifyEmailTitle')}
        subtitle={t('auth.otpSubtitle', {
          email: email || t('auth.yourEmail'),
        })}
      />
      <View style={styles.otpSection}>
        <Text style={[styles.otpLabel, { color: palette.text }]}>
          {t('auth.verificationCode')}
        </Text>
        <OtpInput
          value={otp}
          onChange={(value) => {
            setOtp(value);
            setFeedback(null);
          }}
          disabled={busy}
          hasError={Boolean(feedback)}
        />
      </View>
      <Text style={styles.hint}>{expiryLabel}</Text>
      {feedback ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.message, { color: palette.error }]}
        >
          {feedback.text}
        </Text>
      ) : null}
      <Button
        label={t('auth.verify')}
        loading={busy}
        disabled={busy || otp.length !== 6 || !challengeId || expiresIn <= 0}
        onPress={() => void verify()}
      />
      <Button
        label={
          resendAfter > 0
            ? t('auth.resendOtpCountdown', { seconds: resendAfter })
            : t('auth.resendOtp')
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
    fontFamily: typography.semibold,
    fontSize: 14,
    textAlign: 'center',
  },
  hint: { textAlign: 'center', marginTop: spacing.xs },
  message: { color: colors.danger, textAlign: 'center' },
});

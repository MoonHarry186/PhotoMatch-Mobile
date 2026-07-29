import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { Button, TextField } from '@/components/ui';
import { useI18n } from '@/i18n/i18n-provider';
import { colors, spacing, typography } from '@/theme';

import { authApi } from './auth.api';
import { AuthHeader } from './auth-header';
import { createEmailSchema } from './auth.schemas';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const emailSchema = useMemo(() => createEmailSchema(t), [t]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setMessage(
        parsed.error.issues[0]?.message ?? t('auth.validation.emailInvalid'),
      );
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
      setMessage(t('auth.sendOtpFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScreen testID="forgot-password-screen">
      <AuthHeader
        title={t('auth.forgotPasswordTitle')}
        subtitle={t('auth.forgotPasswordSubtitle')}
      />
      <TextField
        label={t('auth.email')}
        placeholder={t('auth.emailPlaceholder')}
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
        label={t('auth.sendOtp')}
        loading={busy}
        disabled={busy || !email.trim()}
        onPress={() => void submit()}
      />
      <View style={styles.center}>
        <Link href="/(auth)/sign-in" asChild>
          <Pressable
            testID="back-to-sign-in-link"
            style={({ pressed }) => pressed && styles.linkPressed}
          >
            <Text style={styles.linkText}>{t('auth.backToSignIn')}</Text>
          </Pressable>
        </Link>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  linkText: {
    color: colors.link,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  linkPressed: { opacity: 0.68 },
});

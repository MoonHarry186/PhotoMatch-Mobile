import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/i18n-provider';
import { colors } from '@/theme';

type Props = {
  action: 'sign-in' | 'sign-up';
};

export function LegalConsentNotice({ action }: Props) {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Text style={styles.copy}>
        {t(
          action === 'sign-in'
            ? 'auth.legalSignInPrefix'
            : 'auth.legalSignUpPrefix',
        )}{' '}
        <Link style={styles.link} href="/(public)/legal/terms">
          {t('auth.termsOfUse')}
        </Link>{' '}
        {t('auth.and')}{' '}
        <Link style={styles.link} href="/(public)/legal/privacy">
          {t('auth.privacyPolicy')}
        </Link>{' '}
        {t('auth.legalSuffix')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 'auto' },
  copy: {
    color: colors.light.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  link: { color: colors.link, fontWeight: 500 },
});

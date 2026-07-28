import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  action: 'sign-in' | 'sign-up';
};

export function LegalConsentNotice({ action }: Props) {
  const actionLabel = action === 'sign-in' ? 'đăng nhập' : 'đăng ký';

  return (
    <View style={styles.container}>
      <Text style={styles.copy}>
        Bằng việc {actionLabel}, bạn đồng ý với{' '}
        <Link style={styles.link} href="/(public)/legal/terms">
          Điều khoản sử dụng
        </Link>{' '}
        và{' '}
        <Link style={styles.link} href="/(public)/legal/privacy">
          Chính sách quyền riêng tư
        </Link>{' '}
        của PhotoMatch.
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
  link: { color: colors.link },
});

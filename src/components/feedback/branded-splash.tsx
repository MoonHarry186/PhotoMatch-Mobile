import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useOptionalI18n } from '@/i18n/i18n-provider';
import { messages } from '@/i18n/messages';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, spacing } from '@/theme';

export function BrandedSplash() {
  const i18n = useOptionalI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View
      style={[styles.container, { backgroundColor: palette.background }]}
      accessibilityLabel={
        i18n?.t('common.loading') ?? messages.vi['common.loading']
      }
    >
      <Image
        source={require('@/assets/images/splash-logo.png')}
        style={styles.logo}
        contentFit="contain"
      />
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  logo: { width: 220, height: 220 },
});

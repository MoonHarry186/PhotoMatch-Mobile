import { Image } from 'expo-image';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function BrandedSplash() {
  return (
    <View
      style={styles.container}
      accessibilityLabel="Đang khởi động PhotoMatch"
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  logo: { width: 220, height: 220 },
});

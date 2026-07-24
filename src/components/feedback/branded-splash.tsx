import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { gradients, spacing, typography } from '@/theme';

export function BrandedSplash() {
  return (
    <LinearGradient
      colors={gradients.brand}
      style={styles.container}
      accessibilityLabel="Đang khởi động PhotoMatch"
    >
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={styles.logo}
        contentFit="contain"
      />
      <Text style={styles.title}>PhotoMatch</Text>
      <ActivityIndicator color="#FFFFFF" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  logo: { width: 128, height: 128 },
  title: { color: '#FFFFFF', fontFamily: typography.bold, fontSize: 30 },
});

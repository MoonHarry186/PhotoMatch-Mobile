import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/brand-symbol.png')}
        style={styles.logo}
        contentFit="contain"
      />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  logo: { width: 76, height: 76 },
  title: {
    fontFamily: typography.bold,
    fontSize: 28,
    color: colors.light.text,
    textAlign: 'center',
  },
  subtitle: { color: colors.light.muted, textAlign: 'center' },
});

import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, spacing, typography } from '@/theme';

const darkBrandLogo = require('../../../assets/images/brand-symbol-dark.png');

export function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.container}>
      <Image
        source={
          theme?.resolved === 'dark'
            ? darkBrandLogo
            : require('@/assets/images/brand-symbol.png')
        }
        style={styles.logo}
        contentFit="contain"
      />
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: palette.text }]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: palette.muted }]}>
          {subtitle}
        </Text>
      ) : null}
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
    textAlign: 'center',
  },
  subtitle: { textAlign: 'center' },
});

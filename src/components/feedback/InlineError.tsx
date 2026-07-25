import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, spacing } from '@/theme';

export function InlineError({ message }: { message?: string }) {
  const theme = useOptionalTheme();
  const systemTheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette =
    (theme?.resolved ?? systemTheme) === 'dark' ? colors.dark : colors.light;
  if (!message) return null;
  return (
    <View style={styles.container}>
      <Text
        style={[styles.icon, { color: palette.error }]}
        accessibilityElementsHidden
      >
        ⚠
      </Text>
      <Text
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.message, { color: palette.error }]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  icon: {},
  message: { flex: 1, fontSize: 13 },
});

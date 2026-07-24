import { StyleSheet, Text } from 'react-native';

import { AppScreen } from '@/components/layout/app-screen';
import { typography } from '@/theme';

export function TabPlaceholderScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AppScreen>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text>{description}</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: typography.bold, fontSize: 28 },
});

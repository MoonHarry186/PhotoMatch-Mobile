import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, radius, touchTarget } from '@/theme';

type Props = PressableProps & { icon: string; accessibilityLabel: string };

export function IconButton({ icon, accessibilityLabel, ...props }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={styles.button}
      {...props}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: colors.brand, fontSize: 22 },
});

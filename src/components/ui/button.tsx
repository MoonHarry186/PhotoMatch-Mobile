import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { colors, controlHeight, radius, spacing, typography } from '@/theme';

type Props = PressableProps & {
  label: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

export function Button({
  label,
  loading = false,
  disabled,
  variant = 'primary',
  style,
  ...props
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#FFFFFF' : colors.brand}
        />
      ) : (
        <Text
          style={[styles.label, variant !== 'primary' && styles.secondaryLabel]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: controlHeight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: { backgroundColor: colors.brand, borderColor: colors.brand },
  secondary: { backgroundColor: '#FFFFFF', borderColor: colors.brand },
  danger: { backgroundColor: '#FFFFFF', borderColor: colors.danger },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
  label: { color: '#FFFFFF', fontFamily: typography.semibold, fontSize: 16 },
  secondaryLabel: { color: colors.brand },
});

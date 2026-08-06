import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import { useOptionalTheme } from '@/providers/theme-provider';
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
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const variantStyle = {
    backgroundColor:
      variant === 'primary'
        ? colors.brand
        : variant === 'ghost'
          ? 'transparent'
          : palette.surface,
    borderColor:
      variant === 'primary'
        ? colors.brand
        : variant === 'danger'
          ? palette.error
          : variant === 'ghost'
            ? 'transparent'
            : colors.brand,
  };
  const labelColor =
    variant === 'primary'
      ? colors.onBrand
      : variant === 'danger'
        ? palette.error
        : colors.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      cssInterop={false}
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        variantStyle,
        state.pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
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
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.45 },
  label: { fontFamily: typography.semibold, fontSize: 16 },
});

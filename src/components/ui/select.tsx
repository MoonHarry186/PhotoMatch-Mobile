import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  options: SelectOption[];
  value?: string;
  values?: string[];
  multiple?: boolean;
  onChange: (value: string | string[]) => void;
  error?: string;
};

export function Select({
  label,
  options,
  value,
  values = [],
  multiple,
  onChange,
  error,
}: Props) {
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const selected = multiple ? values : value ? [value] : [];
  const toggle = (next: string) => {
    if (!multiple) return onChange(next);
    onChange(
      selected.includes(next)
        ? selected.filter((item) => item !== next)
        : [...selected, next],
    );
  };
  return (
    <View accessibilityRole="radiogroup" style={styles.container}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: active }}
              onPress={() => toggle(option.value)}
              style={[
                styles.option,
                { borderColor: palette.border },
                active && styles.active,
              ]}
            >
              <Text
                style={[{ color: palette.text }, active && styles.activeText]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={[styles.error, { color: palette.error }]}>{error}</Text>
      ) : null}
    </View>
  );
}

export const MultiSelect = (props: Omit<Props, 'multiple' | 'value'>) => (
  <Select {...props} multiple />
);

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontFamily: typography.semibold },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
  },
  active: { backgroundColor: colors.brand, borderColor: colors.brand },
  activeText: { color: colors.onBrand },
  error: {},
});

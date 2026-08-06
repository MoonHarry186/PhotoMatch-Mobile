import { createElement, type ChangeEvent } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InlineError } from '@/components/feedback/InlineError';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

type DateTimeFieldProps = {
  label: string;
  value?: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  error?: string;
};

function dateValue(value?: Date | null) {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateTimeField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  error,
}: DateTimeFieldProps) {
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      {createElement('input', {
        'aria-label': label,
        type: 'date',
        value: dateValue(value),
        min: dateValue(minimumDate),
        max: dateValue(maximumDate),
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          const selected = event.target.value;
          if (selected) onChange(new Date(`${selected}T00:00:00`));
        },
        style: {
          minHeight: 48,
          width: '100%',
          boxSizing: 'border-box',
          border: `1px solid ${error ? palette.error : palette.border}`,
          borderRadius: radius.md,
          padding: `0 ${spacing.lg}px`,
          backgroundColor: palette.surface,
          color: palette.text,
          fontFamily: typography.regular,
          fontSize: 16,
        },
      })}
      <InlineError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: {
    fontFamily: typography.semibold,
    fontSize: 14,
  },
});

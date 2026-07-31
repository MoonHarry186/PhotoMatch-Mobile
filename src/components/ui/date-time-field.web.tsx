import { createElement, type ChangeEvent } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InlineError } from '@/components/feedback/InlineError';
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
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
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
          border: `1px solid ${error ? colors.danger : colors.light.border}`,
          borderRadius: radius.md,
          padding: `0 ${spacing.lg}px`,
          backgroundColor: colors.light.surface,
          color: colors.light.text,
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
    color: colors.light.text,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
});

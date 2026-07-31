import DateTimePicker from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineError } from '@/components/feedback/InlineError';
import { colors, controlHeight, radius, spacing, typography } from '@/theme';

export type DateTimeFieldProps = {
  label: string;
  value?: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
  error?: string;
};

export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  placeholder = 'Chọn ngày',
  error,
}: DateTimeFieldProps) {
  const [visible, setVisible] = useState(false);
  const pickerValue = value ?? maximumDate ?? new Date();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={error}
        onPress={() => setVisible(true)}
        style={[styles.field, error && styles.errorField]}
      >
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value
            ? mode === 'date'
              ? value.toLocaleDateString('vi-VN')
              : value.toLocaleTimeString('vi-VN')
            : placeholder}
        </Text>
        <SymbolView
          name={{
            ios: mode === 'date' ? 'calendar' : 'clock',
            android: mode === 'date' ? 'calendar_today' : 'schedule',
            web: mode === 'date' ? 'calendar_today' : 'schedule',
          }}
          size={20}
          tintColor={colors.brand}
        />
      </Pressable>
      {visible ? (
        <View style={styles.picker}>
          <DateTimePicker
            value={pickerValue}
            mode={mode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={(event, date) => {
              if (Platform.OS !== 'ios') setVisible(false);
              if (event.type !== 'dismissed' && date) onChange(date);
            }}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng bộ chọn ngày"
              onPress={() => setVisible(false)}
              style={styles.done}
            >
              <Text style={styles.doneText}>Xong</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
  field: {
    minHeight: controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
  },
  errorField: { borderColor: colors.danger },
  value: {
    flex: 1,
    color: colors.light.text,
    fontFamily: typography.regular,
    fontSize: 16,
  },
  placeholder: { color: colors.light.muted },
  picker: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    backgroundColor: colors.light.surface,
  },
  done: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
  },
  doneText: { color: colors.brand, fontFamily: typography.semibold },
});

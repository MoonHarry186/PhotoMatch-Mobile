import DateTimePicker from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineError } from '@/components/feedback/InlineError';
import { useOptionalI18n } from '@/i18n/i18n-provider';
import { messages } from '@/i18n/messages';
import { useOptionalTheme } from '@/providers/theme-provider';
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
  placeholder,
  error,
}: DateTimeFieldProps) {
  const [visible, setVisible] = useState(false);
  const i18n = useOptionalI18n();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const locale = i18n?.locale ?? 'vi';
  const resolvedPlaceholder =
    placeholder ??
    i18n?.t('common.chooseDate') ??
    messages.vi['common.chooseDate'];
  const formatLocale = locale === 'en' ? 'en-US' : 'vi-VN';
  const pickerValue = value ?? maximumDate ?? new Date();
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={error}
        onPress={() => setVisible(true)}
        style={[
          styles.field,
          { backgroundColor: palette.surface, borderColor: palette.border },
          error && styles.errorField,
        ]}
      >
        <Text
          style={[
            styles.value,
            { color: value ? palette.text : palette.muted },
          ]}
        >
          {value
            ? mode === 'date'
              ? value.toLocaleDateString(formatLocale)
              : value.toLocaleTimeString(formatLocale)
            : resolvedPlaceholder}
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
        <View
          style={[
            styles.picker,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
        >
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
              accessibilityLabel={
                i18n?.t('common.closeDatePicker') ??
                messages.vi['common.closeDatePicker']
              }
              onPress={() => setVisible(false)}
              style={styles.done}
            >
              <Text style={[styles.doneText, { color: colors.brand }]}>
                {i18n?.t('common.done') ?? messages.vi['common.done']}
              </Text>
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
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  errorField: { borderColor: colors.danger },
  value: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 16,
  },
  picker: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  done: {
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
  },
  doneText: { fontFamily: typography.semibold },
});

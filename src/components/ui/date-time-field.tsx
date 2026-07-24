import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, controlHeight, radius, spacing } from '@/theme';

type Props = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
};

export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.container}>
      <Text>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setVisible(true)}
        style={styles.field}
      >
        <Text>
          {mode === 'date'
            ? value.toLocaleDateString()
            : value.toLocaleTimeString()}
        </Text>
      </Pressable>
      {visible ? (
        <DateTimePicker
          value={value}
          mode={mode}
          onChange={(_, date) => {
            if (Platform.OS !== 'ios') setVisible(false);
            if (date) onChange(date);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  field: {
    minHeight: controlHeight,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
  },
});

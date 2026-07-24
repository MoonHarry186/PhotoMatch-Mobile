import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { TextField } from './text-field';

type Props = {
  min?: string;
  max?: string;
  currency: string;
  onChange: (value: { min?: string; max?: string }) => void;
};

export function PriceRangeField({ min, max, currency, onChange }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <TextField
          label={`Từ (${currency})`}
          keyboardType="number-pad"
          value={min}
          onChangeText={(value) =>
            onChange({ min: value, ...(max ? { max } : {}) })
          }
        />
      </View>
      <View style={styles.item}>
        <TextField
          label={`Đến (${currency})`}
          keyboardType="number-pad"
          value={max}
          onChangeText={(value) =>
            onChange({ ...(min ? { min } : {}), max: value })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  item: { flex: 1 },
});

import { StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/i18n-provider';
import { spacing } from '@/theme';

import { TextField } from './text-field';

type Props = {
  min?: string;
  max?: string;
  currency: string;
  onChange: (value: { min?: string; max?: string }) => void;
};

export function PriceRangeField({ min, max, currency, onChange }: Props) {
  const { t } = useI18n();
  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <TextField
          label={t('common.minPrice', { currency })}
          keyboardType="number-pad"
          value={min}
          onChangeText={(value) =>
            onChange({ min: value, ...(max ? { max } : {}) })
          }
        />
      </View>
      <View style={styles.item}>
        <TextField
          label={t('common.maxPrice', { currency })}
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

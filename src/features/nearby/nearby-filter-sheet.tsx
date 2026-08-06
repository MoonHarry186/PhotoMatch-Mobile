import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Button, MultiSelect, PriceRangeField, Select } from '@/components/ui';
import type { CatalogItemResponse } from '@/generated/api/types.gen';
import { useI18n } from '@/i18n/i18n-provider';
import { useTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

import { nearbyFiltersSchema, type NearbyFilters } from './nearby.types';

export function NearbyFilterSheet({
  visible,
  filters,
  services,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: NearbyFilters;
  services: CatalogItemResponse[];
  onApply: (filters: NearbyFilters) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const radiusOptions = [5, 10, 20, 30, 50, 100].map((value) => ({
    value: String(value),
    label: t('discovery.filters.radiusUnit', { value }),
  }));
  const [draft, setDraft] = useState(filters);
  const [minPrice, setMinPrice] = useState(
    filters.minPrice === undefined ? '' : String(filters.minPrice),
  );
  const [maxPrice, setMaxPrice] = useState(
    filters.maxPrice === undefined ? '' : String(filters.maxPrice),
  );
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const parsed = nearbyFiltersSchema.safeParse({
      ...draft,
      ...(minPrice ? { minPrice: Number(minPrice) } : { minPrice: undefined }),
      ...(maxPrice ? { maxPrice: Number(maxPrice) } : { maxPrice: undefined }),
    });
    if (!parsed.success) {
      setError(t('nearby.invalidFilters'));
      return;
    }
    onApply(parsed.data);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      accessibilityViewIsModal
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('discovery.filters.close')}
        style={[
          styles.backdrop,
          { backgroundColor: colors.discovery.scrimSoft },
        ]}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: palette.text }]}
          >
            {t('nearby.filterTitle')}
          </Text>
          <MultiSelect
            label={t('nearby.filterServices')}
            options={services.map((service) => ({
              value: service.id,
              label: service.name,
            }))}
            values={draft.serviceIds}
            onChange={(value) =>
              setDraft({ ...draft, serviceIds: value as string[] })
            }
          />
          <PriceRangeField
            currency="VND"
            min={minPrice}
            max={maxPrice}
            onChange={(value) => {
              setMinPrice(value.min ?? '');
              setMaxPrice(value.max ?? '');
            }}
          />
          <Select
            label={t('nearby.radius')}
            value={String(draft.radiusKm)}
            options={radiusOptions}
            onChange={(value) =>
              setDraft({ ...draft, radiusKm: Number(value) })
            }
          />
          <FilterSwitch
            label={t('nearby.availableOnly')}
            value={draft.availableOnly}
            onChange={(availableOnly) => setDraft({ ...draft, availableOnly })}
          />
          <FilterSwitch
            label={t('nearby.verifiedOnly')}
            value={draft.verifiedOnly}
            onChange={(verifiedOnly) => setDraft({ ...draft, verifiedOnly })}
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Button label={t('nearby.applyFilters')} onPress={submit} />
          <Button label={t('common.close')} variant="ghost" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function FilterSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.switchRow}>
      <Text style={[styles.switchLabel, { color: palette.text }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        trackColor={{ false: palette.border, true: palette.success }}
        thumbColor={palette.surface}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    overflow: 'hidden',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 22,
  },
  switchRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
    fontFamily: typography.semibold,
  },
  error: { color: colors.danger },
});

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
import { colors, radius, spacing, typography } from '@/theme';

import { nearbyFiltersSchema, type NearbyFilters } from './nearby.types';

const radiusOptions = [5, 10, 20, 30, 50, 100].map((radius) => ({
  value: String(radius),
  label: `${radius} km`,
}));

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
      setError(parsed.error.issues[0]?.message ?? 'Bộ lọc chưa hợp lệ');
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
        accessibilityLabel="Đóng bộ lọc Nearby"
        style={styles.backdrop}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text accessibilityRole="header" style={styles.title}>
            Bộ lọc quanh đây
          </Text>
          <MultiSelect
            label="Dịch vụ"
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
            label="Bán kính"
            value={String(draft.radiusKm)}
            options={radiusOptions}
            onChange={(value) =>
              setDraft({ ...draft, radiusKm: Number(value) })
            }
          />
          <FilterSwitch
            label="Chỉ người đang sẵn sàng"
            value={draft.availableOnly}
            onChange={(availableOnly) => setDraft({ ...draft, availableOnly })}
          />
          <FilterSwitch
            label="Chỉ tài khoản đã xác minh"
            value={draft.verifiedOnly}
            onChange={(verifiedOnly) => setDraft({ ...draft, verifiedOnly })}
          />
          {error ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Button label="Áp dụng bộ lọc" onPress={submit} />
          <Button label="Đóng" variant="ghost" onPress={onClose} />
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
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.48)',
  },
  sheet: {
    maxHeight: '88%',
    overflow: 'hidden',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.light.surface,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    color: colors.light.text,
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
    color: colors.light.text,
    fontFamily: typography.semibold,
  },
  error: { color: colors.danger },
});

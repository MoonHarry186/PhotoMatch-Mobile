import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, MultiSelect, PriceRangeField, Select } from '@/components/ui';
import type { CatalogItemResponse } from '@/generated/api/types.gen';
import { colors, radius, spacing, typography } from '@/theme';

import {
  defaultDiscoveryFilters,
  discoveryFiltersSchema,
  type DiscoveryFilters,
} from './discovery.types';

const radiusOptions = [5, 10, 20, 30, 50, 100].map((value) => ({
  value: String(value),
  label: `${value} km`,
}));

export function DiscoveryFilterSheet({
  filters,
  services,
  onApply,
  onClose,
}: {
  filters: DiscoveryFilters;
  services: CatalogItemResponse[];
  onApply: (filters: DiscoveryFilters) => Promise<void> | void;
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
  const [submitting, setSubmitting] = useState(false);

  const resetDraft = () => {
    setDraft(defaultDiscoveryFilters);
    setMinPrice('');
    setMaxPrice('');
    setError(null);
  };

  const submit = async () => {
    const parsed = discoveryFiltersSchema.safeParse({
      ...draft,
      ...(minPrice ? { minPrice: Number(minPrice) } : { minPrice: undefined }),
      ...(maxPrice ? { maxPrice: Number(maxPrice) } : { maxPrice: undefined }),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Bộ lọc chưa hợp lệ');
      return;
    }
    try {
      setError(null);
      setSubmitting(true);
      await onApply(parsed.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Không thể áp dụng bộ lọc lúc này',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      accessibilityViewIsModal
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đặt lại bộ lọc"
              disabled={submitting}
              hitSlop={8}
              style={styles.headerAction}
              onPress={resetDraft}
            >
              <Text style={styles.resetLabel}>Đặt lại</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>
              Tùy chọn khám phá
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng bộ lọc Khám phá"
              disabled={submitting}
              hitSlop={8}
              style={styles.closeButton}
              onPress={onClose}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={21}
                tintColor={colors.light.text}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FilterSection
              title="Bạn muốn tìm dịch vụ nào?"
              helper="Chọn một hoặc nhiều dịch vụ phù hợp với nhu cầu của bạn."
            >
              <MultiSelect
                label="Dịch vụ"
                options={services.map((service) => ({
                  value: service.id,
                  label: service.name,
                }))}
                values={draft.serviceIds}
                onChange={(serviceIds) =>
                  setDraft({ ...draft, serviceIds: serviceIds as string[] })
                }
              />
            </FilterSection>

            <FilterSection
              title="Khoảng giá"
              helper="Mức giá dự kiến cho dịch vụ, tính bằng VND."
            >
              <PriceRangeField
                currency="VND"
                min={minPrice}
                max={maxPrice}
                onChange={(value) => {
                  setMinPrice(value.min ?? '');
                  setMaxPrice(value.max ?? '');
                }}
              />
            </FilterSection>

            <FilterSection
              title="Khoảng cách"
              helper="Vị trí chỉ được dùng khi bạn chủ động bật Gần tôi."
            >
              <FilterSwitch
                label="Gần tôi"
                description="Tìm Photographer trong bán kính đã chọn"
                value={draft.nearbyOnly}
                onChange={(nearbyOnly) => setDraft({ ...draft, nearbyOnly })}
              />
              {draft.nearbyOnly ? (
                <>
                  <View style={styles.divider} />
                  <Select
                    label="Bán kính gần tôi"
                    value={String(draft.radiusKm)}
                    options={radiusOptions}
                    onChange={(radiusKm) =>
                      setDraft({ ...draft, radiusKm: Number(radiusKm) })
                    }
                  />
                  <View style={styles.privacyNote}>
                    <SymbolView
                      name={{
                        ios: 'lock.shield.fill',
                        android: 'shield_lock',
                        web: 'shield_lock',
                      }}
                      size={18}
                      tintColor={colors.brand}
                    />
                    <Text style={styles.privacyText}>
                      Người khác chỉ thấy khoảng cách gần đúng, không thấy tọa
                      độ của bạn.
                    </Text>
                  </View>
                </>
              ) : null}
            </FilterSection>

            <FilterSection title="Ưu tiên hồ sơ">
              <FilterSwitch
                label="Đang sẵn sàng"
                description="Chỉ hiển thị Photographer đang nhận lịch"
                value={draft.availableOnly}
                onChange={(availableOnly) =>
                  setDraft({ ...draft, availableOnly })
                }
              />
              <View style={styles.divider} />
              <FilterSwitch
                label="Đã xác minh"
                description="Chỉ hiển thị tài khoản đã được xác minh"
                value={draft.verifiedOnly}
                onChange={(verifiedOnly) =>
                  setDraft({ ...draft, verifiedOnly })
                }
              />
            </FilterSection>

            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label="Áp dụng"
              loading={submitting}
              onPress={() => void submit()}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function FilterSection({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {helper ? <Text style={styles.sectionHelper}>{helper}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function FilterSwitch({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchCopy}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description ? (
          <Text style={styles.switchDescription}>{description}</Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        trackColor={{
          false: colors.light.border,
          true: colors.brand,
        }}
        thumbColor={colors.light.surface}
        value={value}
        onValueChange={onChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  flex: { flex: 1 },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
  headerAction: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  resetLabel: {
    color: colors.brand,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    flex: 1,
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.light.text,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  sectionHelper: {
    color: colors.light.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionBody: {
    overflow: 'hidden',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
  },
  switchRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  switchLabel: {
    color: colors.light.text,
    fontFamily: typography.semibold,
  },
  switchDescription: {
    color: colors.light.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.light.border,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.light.infoContainer,
  },
  privacyText: {
    flex: 1,
    color: colors.light.info,
    fontSize: 12,
    lineHeight: 18,
  },
  error: { color: colors.danger },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.light.border,
    backgroundColor: colors.light.surface,
  },
});

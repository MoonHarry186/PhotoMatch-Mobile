import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import { Slider } from '@expo/ui/community/slider';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { getUserErrorMessage, normalizeError } from '@/core/errors';
import type { CatalogItemResponse } from '@/generated/api/types.gen';
import { useI18n } from '@/i18n/i18n-provider';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

import {
  FilterChip,
  FilterSection,
  FilterSwitch,
  formatBudgetSummary,
  PriceRangeInputs,
} from './discovery-filter-controls';
import {
  defaultDiscoveryFilters,
  discoveryFiltersSchema,
  type DiscoveryFilters,
} from './discovery.types';

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
  const { locale, t } = useI18n();
  const theme = useOptionalTheme();
  const insets = useSafeAreaInsets();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const [draft, setDraft] = useState(filters);
  const [minPrice, setMinPrice] = useState(
    filters.minPrice === undefined ? '' : String(filters.minPrice),
  );
  const [maxPrice, setMaxPrice] = useState(
    filters.maxPrice === undefined ? '' : String(filters.maxPrice),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const serviceOptions = useMemo(
    () =>
      services.map((service) => ({
        value: service.id,
        label: service.name,
      })),
    [services],
  );

  const hasDraftChanges =
    draft.serviceIds.length > 0 ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    draft.nearbyOnly ||
    draft.radiusKm !== defaultDiscoveryFilters.radiusKm ||
    draft.availableOnly ||
    draft.verifiedOnly;

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
      setError(t('discovery.filters.invalid'));
      return;
    }
    try {
      setError(null);
      setSubmitting(true);
      await onApply(parsed.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? getUserErrorMessage(normalizeError(caught), locale)
          : t('discovery.filters.applyFailed'),
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
      <StatusBar style={theme?.resolved === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.safe, { backgroundColor: palette.background }]}
      >
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: palette.border,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('discovery.filters.close')}
              disabled={submitting}
              style={({ pressed }) => [
                styles.headerAction,
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                size={21}
                tintColor={palette.text}
              />
            </Pressable>
            <Text
              accessibilityRole="header"
              pointerEvents="none"
              style={[styles.title, { color: palette.text }]}
            >
              {t('discovery.filters.title')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('discovery.filters.reset')}
              accessibilityState={{ disabled: !hasDraftChanges || submitting }}
              disabled={!hasDraftChanges || submitting}
              style={({ pressed }) => [
                styles.resetAction,
                pressed && styles.pressed,
                (!hasDraftChanges || submitting) && styles.disabled,
              ]}
              onPress={resetDraft}
            >
              <Text style={styles.resetLabel}>
                {t('discovery.filters.resetLabel')}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FilterSection
              palette={palette}
              title={t('discovery.filters.services')}
              value={
                draft.serviceIds.length > 0
                  ? t('discovery.filters.servicesSelected', {
                      count: draft.serviceIds.length,
                    })
                  : t('discovery.filters.all')
              }
              helper={t('discovery.filters.servicesHelper')}
            >
              <View style={styles.chipWrap}>
                {serviceOptions.map((service) => (
                  <FilterChip
                    key={service.value}
                    label={service.label}
                    selected={draft.serviceIds.includes(service.value)}
                    palette={palette}
                    multiple
                    variant="service"
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        serviceIds: current.serviceIds.includes(service.value)
                          ? current.serviceIds.filter(
                              (value) => value !== service.value,
                            )
                          : [...current.serviceIds, service.value],
                      }))
                    }
                  />
                ))}
              </View>
              {!serviceOptions.length ? (
                <Text style={[styles.emptyText, { color: palette.muted }]}>
                  {t('discovery.filters.servicesUnavailable')}
                </Text>
              ) : null}
            </FilterSection>

            <FilterSection
              palette={palette}
              title={t('discovery.filters.budget')}
              value={formatBudgetSummary(minPrice, maxPrice, locale)}
              helper={t('discovery.filters.budgetHelper')}
            >
              <PriceRangeInputs
                min={minPrice}
                max={maxPrice}
                palette={palette}
                onChange={(value) => {
                  setMinPrice(value.min ?? '');
                  setMaxPrice(value.max ?? '');
                }}
              />
            </FilterSection>

            <FilterSection
              palette={palette}
              title={t('discovery.filters.distance')}
              value={
                draft.nearbyOnly
                  ? t('discovery.filters.radiusUnit', {
                      value: draft.radiusKm,
                    })
                  : t('discovery.filters.off')
              }
              helper={t('discovery.filters.distanceHelper')}
            >
              <FilterSwitch
                icon={{
                  ios: 'location.fill',
                  android: 'location_on',
                  web: 'location_on',
                }}
                label={t('discovery.filters.nearby')}
                description={t('discovery.filters.nearbyDescription')}
                value={draft.nearbyOnly}
                palette={palette}
                onChange={(nearbyOnly) =>
                  setDraft((current) => ({ ...current, nearbyOnly }))
                }
              />
              {draft.nearbyOnly ? (
                <>
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: palette.border },
                    ]}
                  />
                  <View style={styles.controlGroup}>
                    <View style={styles.radiusHeader}>
                      <Text
                        style={[styles.controlLabel, { color: palette.text }]}
                      >
                        {t('discovery.filters.radius')}
                      </Text>
                      <Text
                        style={[styles.radiusValue, { color: colors.brand }]}
                      >
                        {t('discovery.filters.radiusUnit', {
                          value: draft.radiusKm,
                        })}
                      </Text>
                    </View>
                    <Slider
                      minimumValue={1}
                      maximumValue={100}
                      step={1}
                      value={draft.radiusKm}
                      minimumTrackTintColor={colors.brand}
                      maximumTrackTintColor={palette.border}
                      thumbTintColor={colors.brand}
                      style={styles.radiusSlider}
                      onValueChange={(radiusKm) =>
                        setDraft((current) => ({
                          ...current,
                          radiusKm: Math.round(radiusKm),
                        }))
                      }
                    />
                    <View style={styles.radiusScale}>
                      <Text
                        style={[styles.scaleLabel, { color: palette.muted }]}
                      >
                        {t('discovery.filters.radiusUnit', { value: 1 })}
                      </Text>
                      <Text
                        style={[styles.scaleLabel, { color: palette.muted }]}
                      >
                        {t('discovery.filters.radiusUnit', { value: 100 })}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </FilterSection>

            <FilterSection
              palette={palette}
              title={t('discovery.filters.preferences')}
              helper={t('discovery.filters.preferencesHelper')}
            >
              <FilterSwitch
                icon={{
                  ios: 'bolt.fill',
                  android: 'bolt',
                  web: 'bolt',
                }}
                label={t('discovery.filters.available')}
                description={t('discovery.filters.availableDescription')}
                value={draft.availableOnly}
                palette={palette}
                onChange={(availableOnly) =>
                  setDraft((current) => ({ ...current, availableOnly }))
                }
              />
              <View
                style={[styles.divider, { backgroundColor: palette.border }]}
              />
              <FilterSwitch
                icon={{
                  ios: 'checkmark.seal.fill',
                  android: 'verified',
                  web: 'verified',
                }}
                label={t('discovery.filters.verified')}
                description={t('discovery.filters.verifiedDescription')}
                value={draft.verifiedOnly}
                palette={palette}
                onChange={(verifiedOnly) =>
                  setDraft((current) => ({ ...current, verifiedOnly }))
                }
              />
            </FilterSection>

            {error ? (
              <Text
                accessibilityRole="alert"
                style={[styles.error, { color: palette.error }]}
              >
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: Math.max(insets.bottom, spacing.lg),
                borderTopColor: palette.border,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <Button
              label={t('discovery.filters.apply')}
              loading={submitting}
              style={styles.applyButton}
              onPress={() => void submit()}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    height: 56,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  resetAction: {
    minWidth: 72,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  title: {
    position: 'absolute',
    right: 72,
    left: 72,
    fontFamily: typography.bold,
    fontSize: 18,
    textAlign: 'center',
  },
  resetLabel: {
    color: colors.brand,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  content: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  controlGroup: { gap: spacing.sm },
  radiusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLabel: {
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  radiusValue: {
    fontFamily: typography.bold,
    fontSize: 14,
  },
  radiusSlider: {
    width: '100%',
    height: 36,
  },
  radiusScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: { fontSize: 13, lineHeight: 19 },
  error: {
    fontSize: 13,
    lineHeight: 19,
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: radius.full,
  },
  pressed: { opacity: 0.74 },
  disabled: { opacity: 0.45 },
});

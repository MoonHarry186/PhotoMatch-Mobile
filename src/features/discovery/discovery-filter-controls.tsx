import { SymbolView } from 'expo-symbols';
import { type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useI18n } from '@/i18n/i18n-provider';
import { messages, type Locale } from '@/i18n/messages';
import { colors, radius, spacing, typography } from '@/theme';

export type ThemePalette = (typeof colors)['light'] | (typeof colors)['dark'];

export function FilterSection({
  title,
  value,
  helper,
  palette,
  children,
}: {
  title: string;
  value?: string;
  helper?: string;
  palette: ThemePalette;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, { borderBottomColor: palette.border }]}>
      <View style={styles.sectionHeading}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          {title}
        </Text>
        {value ? (
          <Text style={[styles.sectionValue, { color: palette.muted }]}>
            {value}
          </Text>
        ) : null}
      </View>
      {helper ? (
        <Text style={[styles.sectionHelper, { color: palette.muted }]}>
          {helper}
        </Text>
      ) : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function FilterChip({
  label,
  selected,
  palette,
  multiple = false,
  variant = 'default',
  onPress,
}: {
  label: string;
  selected: boolean;
  palette: ThemePalette;
  multiple?: boolean;
  variant?: 'default' | 'service';
  onPress: () => void;
}) {
  const isService = variant === 'service';

  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.chipPressable, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View
        style={[
          styles.chip,
          isService && styles.serviceChip,
          {
            backgroundColor: isService
              ? palette.surface
              : selected
                ? colors.brand
                : palette.surfaceVariant,
            borderColor: selected ? colors.brand : palette.border,
          },
        ]}
      >
        <Text
          style={[
            styles.chipLabel,
            { color: isService || !selected ? palette.text : '#FFFFFF' },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function FilterSwitch({
  icon,
  label,
  description,
  value,
  palette,
  onChange,
}: {
  icon: ComponentProps<typeof SymbolView>['name'];
  label: string;
  description?: string;
  value: boolean;
  palette: ThemePalette;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessible={false}
      style={({ pressed }) => [styles.switchRow, pressed && styles.pressed]}
      onPress={() => onChange(!value)}
    >
      <View style={styles.switchCopy}>
        <View style={styles.switchTitleRow}>
          <View style={styles.switchLabelGroup}>
            <View
              style={[
                styles.switchIcon,
                {
                  backgroundColor: value
                    ? colors.brand
                    : palette.surfaceVariant,
                },
              ]}
            >
              <SymbolView
                name={icon}
                size={17}
                tintColor={value ? '#FFFFFF' : palette.muted}
              />
            </View>
            <Text style={[styles.switchLabel, { color: palette.text }]}>
              {label}
            </Text>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={label}
            accessibilityState={{ checked: value }}
            style={styles.switchControl}
            trackColor={{ false: palette.border, true: colors.brand }}
            thumbColor={palette.surface}
            ios_backgroundColor={palette.border}
            value={value}
            onValueChange={onChange}
          />
        </View>
        {description ? (
          <Text
            numberOfLines={2}
            style={[styles.switchDescription, { color: palette.muted }]}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function PriceRangeInputs({
  min,
  max,
  palette,
  onChange,
}: {
  min: string;
  max: string;
  palette: ThemePalette;
  onChange: (value: { min?: string; max?: string }) => void;
}) {
  const { locale, t } = useI18n();
  return (
    <View style={styles.priceRow}>
      <View style={styles.priceItem}>
        <Text style={[styles.priceLabel, { color: palette.muted }]}>
          {t('discovery.filters.from')}
        </Text>
        <View style={[styles.priceField, { borderColor: palette.border }]}>
          <TextInput
            accessibilityLabel={t('discovery.filters.minPrice')}
            keyboardType="number-pad"
            placeholder={t('discovery.filters.minPlaceholder')}
            placeholderTextColor={palette.muted}
            style={[styles.priceInput, { color: palette.text }]}
            value={formatVndValue(min, locale)}
            onChangeText={(value) =>
              onChange({ min: onlyDigits(value), ...(max ? { max } : {}) })
            }
          />
          <Text style={[styles.currency, { color: palette.muted }]}>
            {t('discovery.filters.currency')}
          </Text>
        </View>
      </View>
      <View style={styles.priceItem}>
        <Text style={[styles.priceLabel, { color: palette.muted }]}>
          {t('discovery.filters.to')}
        </Text>
        <View style={[styles.priceField, { borderColor: palette.border }]}>
          <TextInput
            accessibilityLabel={t('discovery.filters.maxPrice')}
            keyboardType="number-pad"
            placeholder={t('discovery.filters.maxPlaceholder')}
            placeholderTextColor={palette.muted}
            style={[styles.priceInput, { color: palette.text }]}
            value={formatVndValue(max, locale)}
            onChangeText={(value) =>
              onChange({ ...(min ? { min } : {}), max: onlyDigits(value) })
            }
          />
          <Text style={[styles.currency, { color: palette.muted }]}>
            {t('discovery.filters.currency')}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function formatBudgetSummary(
  min: string,
  max: string,
  locale: Locale = 'vi',
) {
  const currency = messages[locale]['discovery.filters.currency'];
  const noLimit = messages[locale]['discovery.filters.noLimit'];
  if (!min && !max) return messages[locale]['discovery.filters.anyBudget'];
  return `${min ? `${formatVndValue(min, locale)}${currency}` : noLimit} – ${
    max ? `${formatVndValue(max, locale)}${currency}` : noLimit
  }`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function formatVndValue(value: string | number, locale: Locale = 'vi') {
  const digits = onlyDigits(String(value));
  return digits
    ? Number(digits).toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US')
    : '';
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: typography.semibold,
    fontSize: 16,
  },
  sectionValue: {
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  sectionHelper: {
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionBody: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipPressable: {
    borderRadius: radius.full,
  },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  serviceChip: {
    borderRadius: radius.sheet,
  },
  chipSelected: { paddingHorizontal: spacing.md },
  chipLabel: {
    fontFamily: typography.medium,
    fontSize: 14,
  },
  emptyText: { fontSize: 13, lineHeight: 19 },
  controlGroup: { gap: spacing.sm },
  controlLabel: {
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  switchRow: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchControl: {
    flexShrink: 0,
    transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }],
  },
  switchIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  switchCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  switchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabelGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    fontFamily: typography.semibold,
    fontSize: 15,
  },
  switchDescription: {
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
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
  priceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  priceItem: { flex: 1, gap: spacing.xs },
  priceLabel: {
    fontFamily: typography.medium,
    fontSize: 13,
  },
  priceField: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  priceInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    fontFamily: typography.regular,
    fontSize: 15,
  },
  currency: {
    paddingRight: spacing.md,
    fontFamily: typography.semibold,
    fontSize: 14,
  },
  pressed: { opacity: 0.74 },
});

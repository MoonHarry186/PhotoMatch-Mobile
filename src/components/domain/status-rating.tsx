import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useOptionalI18n } from '@/i18n/i18n-provider';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  const toneColors = {
    neutral: { backgroundColor: palette.surfaceVariant, color: palette.text },
    success: {
      backgroundColor: palette.successContainer,
      color: palette.success,
    },
    warning: {
      backgroundColor: palette.warningContainer,
      color: palette.warning,
    },
    danger: { backgroundColor: palette.errorContainer, color: palette.error },
  }[tone];
  return (
    <View
      style={[styles.badge, { backgroundColor: toneColors.backgroundColor }]}
    >
      <Text style={[styles.badgeText, { color: toneColors.color }]}>
        ● {label}
      </Text>
    </View>
  );
}

export function RatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? ((key: 'common.ratingStars') => key);
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View accessibilityRole="radiogroup" style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable
          key={rating}
          accessibilityRole="radio"
          accessibilityLabel={t('common.ratingStars').replace(
            '{rating}',
            String(rating),
          )}
          accessibilityState={{ checked: value === rating, disabled }}
          disabled={disabled}
          hitSlop={6}
          onPress={() => onChange(rating)}
          style={styles.starButton}
        >
          <Text
            style={[
              styles.star,
              { color: rating <= value ? palette.warning : palette.border },
            ]}
          >
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function RatingSummary({
  value,
  count,
}: {
  value: number;
  count: number;
}) {
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? ((key: 'common.ratingSummary') => key);
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <Text
      accessibilityLabel={t('common.ratingSummary')
        .replace('{value}', value.toFixed(1))
        .replace('{count}', String(count))}
    >
      <Text style={{ color: palette.warning }}>★</Text> {value.toFixed(1)} ·{' '}
      {count}
    </Text>
  );
}

export function ReviewCard({
  author,
  rating,
  comment,
}: {
  author: string;
  rating: number;
  comment?: string | null;
}) {
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={[styles.card, { backgroundColor: palette.surface }]}>
      <Text style={[styles.author, { color: palette.text }]}>{author}</Text>
      <RatingSummary value={rating} count={1} />
      {comment ? <Text style={{ color: palette.text }}>{comment}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  badgeText: { fontFamily: typography.medium },
  ratingRow: { flexDirection: 'row' },
  starButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: { fontSize: 30 },
  starActive: {},
  card: {
    padding: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  author: { fontFamily: typography.semibold },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={styles.badgeText}>● {label}</Text>
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
  return (
    <View accessibilityRole="radiogroup" style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable
          key={rating}
          accessibilityRole="radio"
          accessibilityLabel={`${rating} sao`}
          accessibilityState={{ checked: value === rating, disabled }}
          disabled={disabled}
          hitSlop={6}
          onPress={() => onChange(rating)}
          style={styles.starButton}
        >
          <Text style={[styles.star, rating <= value && styles.starActive]}>
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
  return (
    <Text accessibilityLabel={`${value} trên 5 sao từ ${count} đánh giá`}>
      <Text style={styles.starActive}>★</Text> {value.toFixed(1)} · {count}
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
  return (
    <View style={styles.card}>
      <Text style={styles.author}>{author}</Text>
      <RatingSummary value={rating} count={1} />
      {comment ? <Text>{comment}</Text> : null}
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
  neutral: { backgroundColor: '#E2E8F0' },
  success: { backgroundColor: '#DCFCE7' },
  warning: { backgroundColor: '#FEF3C7' },
  danger: { backgroundColor: '#FEE2E2' },
  badgeText: { fontFamily: typography.medium, color: colors.light.text },
  ratingRow: { flexDirection: 'row' },
  starButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  star: { color: '#CBD5E1', fontSize: 30 },
  starActive: { color: '#F59E0B' },
  card: {
    padding: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  author: { fontFamily: typography.semibold },
});

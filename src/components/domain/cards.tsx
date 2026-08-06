import { Image } from 'expo-image';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, elevation, radius, spacing, typography } from '@/theme';
import { useOptionalI18n } from '@/i18n/i18n-provider';
import type { MessageKey } from '@/i18n/messages';
import { useOptionalTheme } from '@/providers/theme-provider';

import { RatingSummary, StatusBadge } from './status-rating';
import { Button, MultiSelect, type SelectOption } from '../ui';

type ProfileCardProps = {
  name: string;
  subtitle?: string;
  imageUrl?: string | null;
  onPress?: () => void;
};

export function ProfileSummaryCard({
  name,
  subtitle,
  imageUrl,
  onPress,
}: ProfileCardProps) {
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: palette.surface }]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.avatar, { backgroundColor: palette.infoContainer }]}
        />
      ) : (
        <View
          style={[styles.avatar, { backgroundColor: palette.infoContainer }]}
        />
      )}
      <View style={styles.grow}>
        <Text style={[styles.name, { color: palette.text }]}>{name}</Text>
        {subtitle ? (
          <Text style={[styles.muted, { color: palette.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function PhotographerCard({
  rating,
  verified,
  ...props
}: ProfileCardProps & { rating: number; verified?: boolean }) {
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? ((key: MessageKey) => key);
  return (
    <View style={styles.cardColumn}>
      <ProfileSummaryCard {...props} />
      <View style={styles.meta}>
        <RatingSummary value={rating} count={1} />
        {verified ? (
          <StatusBadge
            label={t('discovery.interests.verified')}
            tone="success"
          />
        ) : null}
      </View>
    </View>
  );
}

export function PortfolioGrid({ urls }: { urls: string[] }) {
  return (
    <FlatList
      data={urls}
      numColumns={3}
      scrollEnabled={false}
      keyExtractor={(item, index) => `${item}:${index}`}
      renderItem={({ item }) => (
        <Image
          source={{ uri: item }}
          style={styles.gridImage}
          contentFit="cover"
        />
      )}
    />
  );
}

export function FilterChips({
  values,
  onRemove,
}: {
  values: { key: string; label: string }[];
  onRemove: (key: string) => void;
}) {
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? ((key: MessageKey) => key);
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.chips}>
      {values.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={t('common.removeFilter').replace(
            '{label}',
            item.label,
          )}
          onPress={() => onRemove(item.key)}
          style={[styles.chip, { backgroundColor: palette.infoContainer }]}
        >
          <Text style={{ color: palette.text }}>{item.label} ×</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FilterSheet({
  visible,
  options,
  values,
  onChange,
  onApply,
  onClose,
}: {
  visible: boolean;
  options: SelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? ((key: MessageKey) => key);
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
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
        style={styles.sheetOverlay}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
        <Text
          accessibilityRole="header"
          style={[styles.name, { color: palette.text }]}
        >
          {t('discovery.filters.title')}
        </Text>
        <MultiSelect
          label={t('discovery.filters.services')}
          options={options}
          values={values}
          onChange={(next) => onChange(next as string[])}
        />
        <Button label={t('discovery.filters.apply')} onPress={onApply} />
      </View>
    </Modal>
  );
}

export function BookingTimeline({
  items,
}: {
  items: { id: string; label: string; time: string; active?: boolean }[];
}) {
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.timeline}>
      {items.map((item) => (
        <View key={item.id} style={styles.timelineItem}>
          <Text
            style={[
              item.active ? styles.activeDot : styles.dot,
              { color: item.active ? palette.info : palette.border },
            ]}
          >
            ●
          </Text>
          <View>
            <Text style={[styles.name, { color: palette.text }]}>
              {item.label}
            </Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              {item.time}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...elevation.card,
  },
  cardColumn: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  grow: { flex: 1, gap: spacing.xs },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  name: { fontFamily: typography.semibold },
  muted: {},
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  gridImage: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: radius.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
  },
  timeline: { gap: spacing.lg },
  timelineItem: { flexDirection: 'row', gap: spacing.md },
  dot: {},
  activeDot: { color: colors.brand },
  sheetOverlay: { flex: 1, backgroundColor: colors.discovery.scrimSoft },
  sheet: {
    padding: spacing.xl,
    gap: spacing.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
});

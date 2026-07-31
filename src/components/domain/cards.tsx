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
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar} />
      )}
      <View style={styles.grow}>
        <Text style={styles.name}>{name}</Text>
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

export function PhotographerCard({
  rating,
  verified,
  ...props
}: ProfileCardProps & { rating: number; verified?: boolean }) {
  return (
    <View style={styles.cardColumn}>
      <ProfileSummaryCard {...props} />
      <View style={styles.meta}>
        <RatingSummary value={rating} count={1} />
        {verified ? <StatusBadge label="Đã xác minh" tone="success" /> : null}
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
  return (
    <View style={styles.chips}>
      {values.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityLabel={`Bỏ bộ lọc ${item.label}`}
          onPress={() => onRemove(item.key)}
          style={styles.chip}
        >
          <Text>{item.label} ×</Text>
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
        accessibilityLabel="Đóng bộ lọc"
        style={styles.sheetOverlay}
        onPress={onClose}
      />
      <View style={styles.sheet}>
        <Text accessibilityRole="header" style={styles.name}>
          Bộ lọc
        </Text>
        <MultiSelect
          label="Lựa chọn"
          options={options}
          values={values}
          onChange={(next) => onChange(next as string[])}
        />
        <Button label="Áp dụng" onPress={onApply} />
      </View>
    </Modal>
  );
}

export function BookingTimeline({
  items,
}: {
  items: { id: string; label: string; time: string; active?: boolean }[];
}) {
  return (
    <View style={styles.timeline}>
      {items.map((item) => (
        <View key={item.id} style={styles.timelineItem}>
          <Text style={item.active ? styles.activeDot : styles.dot}>●</Text>
          <View>
            <Text style={styles.name}>{item.label}</Text>
            <Text style={styles.muted}>{item.time}</Text>
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
    backgroundColor: '#FFFFFF',
    ...elevation.card,
  },
  cardColumn: {
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  grow: { flex: 1, gap: spacing.xs },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
  },
  name: { fontFamily: typography.semibold, color: colors.light.text },
  muted: { color: colors.light.muted },
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
    backgroundColor: '#DBEAFE',
    borderRadius: radius.full,
  },
  timeline: { gap: spacing.lg },
  timelineItem: { flexDirection: 'row', gap: spacing.md },
  dot: { color: colors.light.border },
  activeDot: { color: colors.brand },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(2,6,23,0.48)' },
  sheet: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
});

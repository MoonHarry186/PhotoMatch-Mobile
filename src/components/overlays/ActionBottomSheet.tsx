import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

import { Button } from '../ui/button';

export interface ActionBottomSheetAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export function ActionBottomSheet({
  visible,
  title,
  description,
  actions,
  dismissible = true,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  description: string;
  actions: ActionBottomSheetAction[];
  dismissible?: boolean;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      accessibilityViewIsModal
      onRequestClose={() => {
        if (dismissible) onDismiss();
      }}
    >
      <View style={styles.host}>
        <Pressable
          accessibilityLabel="Đóng bảng lựa chọn"
          disabled={!dismissible}
          style={styles.backdrop}
          onPress={onDismiss}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.surface,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.description, { color: palette.muted }]}>
            {description}
          </Text>
          {actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              variant={action.variant ?? 'secondary'}
              onPress={action.onPress}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2,6,23,0.56)',
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.xl,
    gap: spacing.md,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
  },
  title: { fontFamily: typography.bold, fontSize: 21 },
  description: { lineHeight: 22 },
});

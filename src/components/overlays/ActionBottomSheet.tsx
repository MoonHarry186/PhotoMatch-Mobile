import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOptionalI18n } from '@/i18n/i18n-provider';
import { messages } from '@/i18n/messages';
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
  const i18n = useOptionalI18n();
  const closeLabel = i18n?.t('common.close') ?? messages.vi['common.close'];
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
          accessibilityLabel={closeLabel}
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
    backgroundColor: colors.discovery.scrimSoft,
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

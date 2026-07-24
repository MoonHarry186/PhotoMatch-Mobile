import { Modal, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { Button } from './button';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog(props: Props) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="fade"
      accessibilityViewIsModal
      onRequestClose={props.onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.title}>
            {props.title}
          </Text>
          <Text>{props.message}</Text>
          <View style={styles.actions}>
            <Button label="Hủy" variant="ghost" onPress={props.onCancel} />
            <Button
              label={props.confirmLabel}
              variant={props.destructive ? 'danger' : 'primary'}
              onPress={props.onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.64)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.lg,
    backgroundColor: colors.light.surface,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { fontFamily: typography.bold, fontSize: 20 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});

import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

export interface AppDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AppDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: AppDialogProps) {
  const theme = useTheme();
  return (
    <Portal>
      <Dialog visible={visible} dismissable={!loading} onDismiss={onCancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{description}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={loading} onPress={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            disabled={loading}
            textColor={destructive ? theme.colors.error : undefined}
            onPress={onConfirm}
          >
            {loading ? <ActivityIndicator size={18} /> : confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

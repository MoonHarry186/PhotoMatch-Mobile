import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

import { useOptionalI18n } from '@/i18n/i18n-provider';
import { messages } from '@/i18n/messages';

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
  cancelLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: AppDialogProps) {
  const i18n = useOptionalI18n();
  const resolvedCancelLabel =
    cancelLabel ?? i18n?.t('common.cancel') ?? messages.vi['common.cancel'];
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
            {resolvedCancelLabel}
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

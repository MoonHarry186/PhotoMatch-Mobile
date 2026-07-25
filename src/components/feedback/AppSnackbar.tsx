import { Portal, Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SnackbarPayload {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

export function AppSnackbar({
  payload,
  onDismiss,
}: {
  payload: SnackbarPayload | null;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Portal>
      <Snackbar
        visible={Boolean(payload)}
        duration={payload?.duration ?? 5_000}
        onDismiss={onDismiss}
        wrapperStyle={{ bottom: insets.bottom + 64 }}
        action={
          payload?.actionLabel
            ? {
                label: payload.actionLabel,
                onPress: () => {
                  payload.onAction?.();
                  onDismiss();
                },
              }
            : undefined
        }
        accessibilityLiveRegion="polite"
      >
        {payload?.message ?? ''}
      </Snackbar>
    </Portal>
  );
}

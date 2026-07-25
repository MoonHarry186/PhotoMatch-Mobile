import { AppDialog } from '@/components/overlays';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog(props: Props) {
  return (
    <AppDialog
      visible={props.visible}
      title={props.title}
      description={props.message}
      confirmLabel={props.confirmLabel}
      destructive={props.destructive}
      loading={props.loading}
      onConfirm={props.onConfirm}
      onCancel={props.onCancel}
    />
  );
}

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { Button } from '../ui';

type Props = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function State({ title, message, actionLabel, onAction }: Props) {
  return (
    <View accessibilityRole="summary" style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <View accessibilityRole="progressbar" style={styles.container}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text>{label}</Text>
    </View>
  );
}

export function SkeletonState({ lines = 4 }: { lines?: number }) {
  return (
    <View accessibilityLabel="Đang tải nội dung" style={styles.skeletons}>
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={[styles.skeleton, { width: `${100 - index * 8}%` }]}
        />
      ))}
    </View>
  );
}

export const EmptyState = (props: Partial<Props>) => (
  <State title={props.title ?? 'Chưa có dữ liệu'} {...props} />
);
export const NoResultsState = (props: Partial<Props>) => (
  <State title={props.title ?? 'Không tìm thấy kết quả'} {...props} />
);
export const OfflineState = (props: Partial<Props>) => (
  <State
    title={props.title ?? 'Bạn đang ngoại tuyến'}
    message={props.message ?? 'Kiểm tra kết nối mạng rồi thử lại.'}
    actionLabel="Thử lại"
    {...props}
  />
);
export const NotFoundState = (props: Partial<Props>) => (
  <State title={props.title ?? 'Không tìm thấy nội dung'} {...props} />
);
export const AccessDeniedState = (props: Partial<Props>) => (
  <State
    title={props.title ?? 'Bạn không có quyền truy cập'}
    message={
      props.message ??
      'Nội dung không khả dụng với tài khoản hoặc vai trò hiện tại.'
    }
    {...props}
  />
);
export const ActionFeedback = State;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: {
    fontFamily: typography.bold,
    color: colors.light.text,
    fontSize: 20,
    textAlign: 'center',
  },
  message: { color: colors.light.muted, textAlign: 'center' },
  skeletons: { gap: spacing.md },
  skeleton: { height: 18, borderRadius: 9, backgroundColor: '#E2E8F0' },
});

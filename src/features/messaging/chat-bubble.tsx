import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MessageView } from './messaging.types';
import { colors, radius, spacing, typography } from '@/theme';

export function ChatBubble({
  message,
  onRetry,
}: {
  message: MessageView;
  onRetry?: () => void;
}) {
  const failed =
    message.localStatus === 'failed' || message.status === 'FAILED';
  const label =
    message.messageType === 'TEXT'
      ? message.content || ''
      : message.messageType === 'IMAGE'
        ? 'Ảnh đính kèm'
        : message.messageType === 'FILE'
          ? 'Tệp đính kèm'
          : message.content || 'Thông báo hệ thống';
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.bubble,
          message.messageType === 'SYSTEM' && styles.system,
        ]}
      >
        <Text style={styles.content}>{label}</Text>
      </View>
      {failed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tin nhắn chưa gửi được. Nhấn để thử lại."
          onPress={onRetry}
          style={styles.retry}
        >
          <Text style={styles.failed}>Chưa gửi được · Thử lại</Text>
        </Pressable>
      ) : (
        <Text style={styles.meta}>
          {new Date(message.sentAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          · {message.status === 'DELIVERED' ? 'Đã nhận' : 'Đã gửi'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', maxWidth: '84%', gap: spacing.xs },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.light.infoContainer,
  },
  system: { backgroundColor: colors.light.surfaceVariant },
  content: { color: colors.light.text, lineHeight: 21 },
  meta: {
    color: colors.light.muted,
    fontSize: 12,
    fontFamily: typography.medium,
  },
  retry: { minHeight: 32, justifyContent: 'center' },
  failed: { color: colors.light.error, fontSize: 12 },
});

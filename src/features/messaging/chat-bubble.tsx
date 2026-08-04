import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaPlaceholder } from '@/components/media/media-components';
import { getSignedAssetUrl } from '@/services/media/signed-url-cache';
import { useTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';

import type { MessageView } from './messaging.types';

const elevationShadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
} as const;

export function ChatBubble({
  message,
  isMine,
  onRetry,
}: {
  message: MessageView;
  isMine: boolean;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const palette = theme.resolved === 'dark' ? colors.dark : colors.light;
  const failed =
    message.localStatus === 'failed' || message.status === 'FAILED';
  const isImage = message.messageType === 'IMAGE' && Boolean(message.assetId);
  const media = useQuery({
    queryKey: ['signed-message-asset', message.assetId],
    queryFn: () => getSignedAssetUrl(message.assetId!),
    enabled: isImage,
    staleTime: 4 * 60_000,
  });
  const label =
    message.messageType === 'TEXT'
      ? message.content || ''
      : message.messageType === 'FILE'
        ? 'Tệp đính kèm'
        : message.messageType === 'SYSTEM'
          ? message.content || 'Thông báo hệ thống'
          : 'Ảnh đính kèm';
  const time = new Date(message.sentAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, isMine ? styles.mine : styles.received]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: isMine ? colors.brand : palette.surfaceVariant },
          isMine ? styles.sentShape : styles.receivedShape,
          message.messageType === 'SYSTEM' && {
            backgroundColor: palette.surfaceVariant,
          },
          isImage && styles.mediaBubble,
        ]}
      >
        {isImage ? (
          <>
            {media.data ? (
              <Image
                source={{ uri: media.data }}
                contentFit="cover"
                transition={180}
                style={styles.image}
              />
            ) : (
              <MediaPlaceholder label="Đang tải ảnh…" />
            )}
            {message.content ? (
              <Text
                style={[
                  styles.content,
                  { color: isMine ? '#FFFFFF' : palette.text },
                  styles.caption,
                ]}
              >
                {message.content}
              </Text>
            ) : null}
          </>
        ) : (
          <Text
            style={[
              styles.content,
              { color: isMine ? '#FFFFFF' : palette.text },
              message.messageType === 'SYSTEM' && { color: palette.muted },
            ]}
          >
            {label}
          </Text>
        )}
      </View>
      {failed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tin nhắn chưa gửi được. Nhấn để thử lại."
          onPress={onRetry}
          style={styles.retry}
        >
          <Text style={[styles.failed, { color: palette.error }]}>
            Chưa gửi được · Thử lại
          </Text>
        </Pressable>
      ) : (
        <View style={[styles.metaRow, isMine && styles.metaMine]}>
          <Text style={[styles.meta, { color: palette.muted }]}>{time}</Text>
          {isMine ? (
            <Text style={[styles.receipt, { color: colors.brand }]}>✓✓</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxWidth: '86%', gap: spacing.xs },
  received: { alignSelf: 'flex-start' },
  mine: { alignSelf: 'flex-end' },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...elevationShadow,
  },
  receivedShape: { borderRadius: radius.lg, borderBottomLeftRadius: 4 },
  sentShape: { borderRadius: radius.lg, borderBottomRightRadius: 4 },
  mediaBubble: { padding: spacing.xs, overflow: 'hidden' },
  image: { width: 280, maxWidth: '100%', aspectRatio: 4 / 3, borderRadius: 10 },
  content: { fontFamily: typography.regular, fontSize: 16, lineHeight: 24 },
  caption: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  metaMine: { justifyContent: 'flex-end' },
  meta: { fontFamily: typography.medium, fontSize: 12, lineHeight: 16 },
  receipt: { fontSize: 14, fontFamily: typography.bold, letterSpacing: -3 },
  retry: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  failed: { fontFamily: typography.medium, fontSize: 12 },
});

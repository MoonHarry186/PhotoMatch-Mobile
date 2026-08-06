import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaPlaceholder } from '@/components/media/media-components';
import { useOptionalI18n } from '@/i18n/i18n-provider';
import { messages, type MessageKey } from '@/i18n/messages';
import { getSignedAssetUrl } from '@/services/media/signed-url-cache';
import { useTheme } from '@/providers/theme-provider';
import { colors, radius, spacing, typography } from '@/theme';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import type { MessageView } from './messaging.types';

const elevationShadow = {
  shadowColor: colors.dark.text,
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
  const i18n = useOptionalI18n();
  const [showMeta, setShowMeta] = useState(false);
  const t = i18n?.t ?? ((key: MessageKey) => messages.vi[key]);
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
        ? t('messaging.file')
        : message.messageType === 'SYSTEM'
          ? message.content || t('messaging.system')
          : t('messaging.image');
  const time = new Date(message.sentAt).toLocaleTimeString(
    i18n?.locale === 'en' ? 'en-US' : 'vi-VN',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
  const receiptStatus =
    message.receiptStatus ??
    (message.status === 'DELIVERED' ? 'delivered' : 'sent');
  const receiptGlyph =
    message.localStatus === 'sending'
      ? '…'
      : receiptStatus === 'read'
        ? '✓✓'
        : receiptStatus === 'delivered'
          ? '✓✓'
          : '✓';
  const receiptLabel =
    message.localStatus === 'sending'
      ? t('messaging.sending')
      : receiptStatus === 'read'
        ? t('messaging.read')
        : receiptStatus === 'delivered'
          ? t('messaging.delivered')
          : t('messaging.sent');
  const receiptColor = receiptStatus === 'read' ? colors.brand : palette.muted;

  return (
    <MessageBubbleRow isMine={isMine}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showMeta }}
        onPress={() => setShowMeta((value) => !value)}
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
              <MediaPlaceholder label={t('messaging.loadingImage')} />
            )}
            {message.content ? (
              <Text
                style={[
                  styles.content,
                  { color: isMine ? colors.onBrand : palette.text },
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
              { color: isMine ? colors.onBrand : palette.text },
              message.messageType === 'SYSTEM' && { color: palette.muted },
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
      {failed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('messaging.failedA11y')}
          onPress={onRetry}
          style={styles.retry}
        >
          <Text style={[styles.failed, { color: palette.error }]}>
            {t('messaging.failedRetry')}
          </Text>
        </Pressable>
      ) : showMeta ? (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.metaRow, isMine && styles.metaMine]}
        >
          <Text style={[styles.meta, { color: palette.muted }]}>{time}</Text>
          {isMine ? (
            <Text
              accessibilityLabel={receiptLabel}
              style={[styles.receipt, { color: receiptColor }]}
            >
              {receiptGlyph}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
    </MessageBubbleRow>
  );
}

export function MessageBubbleRow({
  isMine,
  children,
}: {
  isMine: boolean;
  children: ReactNode;
}) {
  return (
    <View style={[styles.container, isMine ? styles.mine : styles.received]}>
      {children}
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

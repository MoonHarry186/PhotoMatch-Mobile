import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { useOptionalTheme } from '@/providers/theme-provider';
import { useOptionalI18n } from '@/i18n/i18n-provider';
import type { MessageKey } from '@/i18n/messages';
import { colors, radius, spacing, typography } from '@/theme';

export type MessageStatus =
  'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export function MessageBubble({
  content,
  time,
  status,
  onRetry,
}: {
  content: string;
  time: string;
  status: MessageStatus;
  onRetry?: () => void;
}) {
  const theme = useOptionalTheme();
  const i18n = useOptionalI18n();
  const t = i18n?.t ?? ((key: MessageKey) => key);
  const systemTheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette =
    (theme?.resolved ?? systemTheme) === 'dark' ? colors.dark : colors.light;
  return (
    <View style={styles.container}>
      <View style={[styles.bubble, { backgroundColor: palette.infoContainer }]}>
        <Text style={[styles.content, { color: palette.text }]}>{content}</Text>
      </View>
      {status === 'failed' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('messaging.failedA11y')}
          style={styles.meta}
          onPress={onRetry}
        >
          <Text style={[styles.failed, { color: palette.error }]}>
            {time} · ⚠ {t('messaging.failedRetry')}
          </Text>
        </Pressable>
      ) : (
        <Text style={[styles.status, { color: palette.muted }]}>
          {time} ·{' '}
          {t(
            `messaging.${status}` as
              | 'messaging.sending'
              | 'messaging.sent'
              | 'messaging.delivered'
              | 'messaging.read',
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { maxWidth: '82%', gap: spacing.xs },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  content: { lineHeight: 21 },
  meta: { minHeight: 32, justifyContent: 'center' },
  failed: { fontSize: 12 },
  status: {
    fontFamily: typography.medium,
    fontSize: 12,
  },
});

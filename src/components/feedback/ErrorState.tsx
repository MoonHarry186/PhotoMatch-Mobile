import type { ReactNode } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, spacing, typography } from '@/theme';

import { Button } from '../ui';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  message?: string;
  icon?: ReactNode;
  primaryActionLabel?: string;
  actionLabel?: string;
  onPrimaryAction?: () => void;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function ErrorState({
  title = 'Không thể tải dữ liệu',
  description,
  message,
  icon,
  primaryActionLabel,
  actionLabel,
  onPrimaryAction,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: ErrorStateProps) {
  const theme = useOptionalTheme();
  const systemTheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const resolved = theme?.resolved ?? systemTheme;
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  const primaryHandler = onPrimaryAction ?? onAction;
  return (
    <View
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <View style={[styles.icon, { backgroundColor: palette.errorContainer }]}>
        {icon ?? (
          <Text style={[styles.iconText, { color: palette.onErrorContainer }]}>
            !
          </Text>
        )}
      </View>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <Text style={[styles.description, { color: palette.muted }]}>
        {description ??
          message ??
          'Có vẻ kết nối đang gặp sự cố. Hãy thử lại sau nhé.'}
      </Text>
      {primaryHandler ? (
        <Button
          label={primaryActionLabel ?? actionLabel ?? 'Thử lại'}
          onPress={primaryHandler}
        />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <Button
          label={secondaryActionLabel}
          variant="ghost"
          onPress={onSecondaryAction}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontFamily: typography.bold, fontSize: 28 },
  title: {
    fontFamily: typography.bold,
    fontSize: 20,
    textAlign: 'center',
  },
  description: { maxWidth: 420, textAlign: 'center', lineHeight: 22 },
});

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useOptionalI18n, type Translate } from '@/i18n/i18n-provider';
import { messages, type MessageKey } from '@/i18n/messages';
import { useOptionalTheme } from '@/providers/theme-provider';
import { colors, spacing, typography } from '@/theme';

import { Button } from '../ui';

type Props = {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function State({ title, message, actionLabel, onAction }: Props) {
  const { resolved } = useOptionalTheme() ?? { resolved: 'light' as const };
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View accessibilityRole="summary" style={styles.container}>
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: palette.muted }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function LoadingState({ label }: { label?: string }) {
  const t = useTranslate();
  const resolvedLabel = label ?? t('common.loading');
  return (
    <View accessibilityRole="progressbar" style={styles.container}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text>{resolvedLabel}</Text>
    </View>
  );
}

export function SkeletonState({ lines = 4 }: { lines?: number }) {
  const t = useTranslate();
  const theme = useOptionalTheme();
  const palette = theme?.resolved === 'dark' ? colors.dark : colors.light;
  return (
    <View accessibilityLabel={t('common.loading')} style={styles.skeletons}>
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={[
            styles.skeleton,
            {
              width: `${100 - index * 8}%`,
              backgroundColor: palette.surfaceVariant,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function EmptyState(props: Partial<Props>) {
  const t = useTranslate();
  return <State title={props.title ?? t('common.noData')} {...props} />;
}

export function NoResultsState(props: Partial<Props>) {
  const t = useTranslate();
  return <State title={props.title ?? t('common.noResults')} {...props} />;
}

export function OfflineState(props: Partial<Props>) {
  const t = useTranslate();
  return (
    <State
      title={props.title ?? t('common.offline')}
      message={props.message ?? t('common.offlineMessage')}
      actionLabel={props.actionLabel ?? t('common.retry')}
      {...props}
    />
  );
}

export function NotFoundState(props: Partial<Props>) {
  const t = useTranslate();
  return <State title={props.title ?? t('common.noContent')} {...props} />;
}

export function AccessDeniedState(props: Partial<Props>) {
  const t = useTranslate();
  return (
    <State
      title={props.title ?? t('common.accessDenied')}
      message={props.message ?? t('common.noContent')}
      {...props}
    />
  );
}
export const ActionFeedback = State;

function useTranslate(): Translate {
  const i18n = useOptionalI18n();
  return i18n?.t ?? ((key: MessageKey) => messages.vi[key]);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  title: { fontFamily: typography.bold, fontSize: 20, textAlign: 'center' },
  message: { textAlign: 'center' },
  skeletons: { gap: spacing.md },
  skeleton: {
    height: 18,
    borderRadius: 9,
  },
});

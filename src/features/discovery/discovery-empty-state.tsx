import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n/i18n-provider';
import { colors, radius, spacing, typography } from '@/theme';

export function DiscoveryEmptyState({
  onAdjustFilters,
  onRetry,
}: {
  onAdjustFilters: () => void;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <View accessibilityRole="summary" style={styles.container}>
      <View style={styles.iconShell}>
        <SymbolView
          name={{
            ios: 'camera.aperture',
            android: 'photo_camera',
            web: 'photo_camera',
          }}
          size={30}
          tintColor={colors.discovery.info}
        />
      </View>
      <Text style={styles.title}>{t('discovery.empty.title')}</Text>
      <Text style={styles.message}>{t('discovery.empty.message')}</Text>
      <View style={styles.actions}>
        <Button
          label={t('discovery.empty.adjustFilters')}
          onPress={onAdjustFilters}
        />
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('discovery.empty.reloadA11y')}
            hitSlop={8}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            onPress={onRetry}
          >
            <Text style={styles.retryLabel}>{t('discovery.empty.reload')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function DiscoveryErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <View
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
      <View style={styles.errorIconShell}>
        <Text style={styles.errorIcon}>!</Text>
      </View>
      <Text style={styles.title}>{t('discovery.error.title')}</Text>
      <Text style={styles.message}>{t('discovery.error.message')}</Text>
      <Button label={t('common.retry')} onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  iconShell: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.discovery.infoSoft,
  },
  errorIconShell: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.discovery.rejectSoft,
  },
  errorIcon: {
    color: colors.discovery.reject,
    fontFamily: typography.bold,
    fontSize: 30,
  },
  title: {
    color: colors.onBrand,
    fontFamily: typography.bold,
    fontSize: 20,
    textAlign: 'center',
  },
  message: {
    maxWidth: 320,
    color: colors.discovery.whiteTextSubtle,
    lineHeight: 21,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  retry: { padding: spacing.sm },
  retryLabel: {
    color: colors.onBrand,
    fontFamily: typography.semibold,
  },
  pressed: { opacity: 0.72 },
});

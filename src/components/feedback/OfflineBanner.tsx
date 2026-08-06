import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@/hooks/use-network-status';
import { useI18n } from '@/i18n/i18n-provider';

import { AppBanner } from './AppBanner';

export function OfflineBanner() {
  const { t } = useI18n();
  const { isOnline, refresh } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  if (isOnline) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top }]}>
      <AppBanner
        visible
        title={t('common.offline')}
        message={t('common.offlineMessage')}
        actions={[
          { label: t('common.checkAgain'), onPress: () => void refresh() },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
});

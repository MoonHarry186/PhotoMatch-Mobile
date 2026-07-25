import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNetworkStatus } from '@/hooks/use-network-status';

import { AppBanner } from './AppBanner';

export function OfflineBanner() {
  const { isOnline, refresh } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  if (isOnline) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top }]}>
      <AppBanner
        visible
        title="Bạn đang ngoại tuyến"
        message="Một số tính năng có thể bị hạn chế."
        actions={[{ label: 'Kiểm tra lại', onPress: () => void refresh() }]}
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

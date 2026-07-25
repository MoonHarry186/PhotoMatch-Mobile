import { useNetInfo } from '@react-native-community/netinfo';

import { refreshNetworkStatus } from '@/core/network/network-status';

export function useNetworkStatus() {
  const value = useNetInfo();
  return {
    isOnline:
      value.isConnected !== false && value.isInternetReachable !== false,
    refresh: refreshNetworkStatus,
  };
}

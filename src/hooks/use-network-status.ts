import NetInfo, { useNetInfo } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const value = useNetInfo();
  return {
    isOnline:
      value.isConnected !== false && value.isInternetReachable !== false,
    refresh: NetInfo.refresh,
  };
}

import NetInfo from '@react-native-community/netinfo';

export function subscribeToNetworkStatus(
  listener: (isOnline: boolean) => void,
) {
  return NetInfo.addEventListener((state) => {
    listener(
      state.isConnected !== false && state.isInternetReachable !== false,
    );
  });
}

export async function refreshNetworkStatus(): Promise<boolean> {
  const state = await NetInfo.refresh();
  return state.isConnected !== false && state.isInternetReachable !== false;
}

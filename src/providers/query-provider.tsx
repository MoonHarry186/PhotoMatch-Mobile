import NetInfo from '@react-native-community/netinfo';
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

export function createPhotoMatchQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          const status =
            'status' in Object(error)
              ? Number(Object(error).status)
              : undefined;
          return status && status >= 400 && status < 500
            ? false
            : failureCount < 2;
        },
        refetchOnReconnect: true,
      },
      mutations: { retry: false },
    },
  });
}

export function QueryProvider({ children }: React.PropsWithChildren) {
  const [queryClient] = useState(createPhotoMatchQueryClient);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      onlineManager.setOnline(state.isConnected === true);
    });
  }, []);

  useEffect(() => {
    const listener = (status: AppStateStatus) => {
      if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
    };
    const subscription = AppState.addEventListener('change', listener);
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

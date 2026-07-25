import {
  focusManager,
  onlineManager,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { normalizeError, reportError, type AppError } from '@/core/errors';
import { subscribeToNetworkStatus } from '@/core/network/network-status';

export function shouldRetry(failureCount: number, error: unknown): boolean {
  const normalized = normalizeError(error);
  return (
    failureCount < 2 &&
    (normalized.code === 'NETWORK_ERROR' || normalized.code === 'SERVER_ERROR')
  );
}

export function createPhotoMatchQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        const normalized: AppError = normalizeError(error);
        reportError(normalized, {
          feature: 'query',
          queryKey: query.queryKey,
          hasCachedData: query.state.data !== undefined,
        });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 5_000),
        refetchOnReconnect: true,
      },
      mutations: { retry: false },
    },
  });
}

export function QueryProvider({ children }: React.PropsWithChildren) {
  const [queryClient] = useState(createPhotoMatchQueryClient);

  useEffect(() => {
    return subscribeToNetworkStatus((isOnline) => {
      onlineManager.setOnline(isOnline);
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

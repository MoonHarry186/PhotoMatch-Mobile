import { infiniteQueryOptions } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/query-keys';

import { messagingApi } from './messaging.api';

export function conversationMessagesOptions(
  scope: { userId: string; roleId: string },
  conversationId: string,
) {
  return infiniteQueryOptions({
    queryKey: queryKeys.conversationMessages(scope, conversationId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      messagingApi.messages(conversationId, pageParam ?? undefined, signal),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
  });
}

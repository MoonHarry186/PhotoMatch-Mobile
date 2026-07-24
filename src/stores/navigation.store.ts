import { create } from 'zustand';

import type { DeepLinkDestination } from '@/schemas/runtime-contracts';

type NavigationState = {
  scopeKey: string | null;
  pending: DeepLinkDestination | null;
  queue: (scopeKey: string, destination: DeepLinkDestination) => void;
  consume: (scopeKey: string) => DeepLinkDestination | null;
  clear: () => void;
};

export const useNavigationStore = create<NavigationState>((set, get) => ({
  scopeKey: null,
  pending: null,
  queue: (scopeKey, pending) => set({ scopeKey, pending }),
  consume: (scopeKey) => {
    const state = get();
    const isPendingAuthentication = state.scopeKey?.endsWith(':pending-auth');
    if (state.scopeKey !== scopeKey && !isPendingAuthentication) {
      set({ scopeKey, pending: null });
      return null;
    }
    set({ pending: null });
    return state.pending;
  },
  clear: () => set({ scopeKey: null, pending: null }),
}));

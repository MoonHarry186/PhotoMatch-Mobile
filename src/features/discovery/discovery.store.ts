import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  defaultDiscoveryFilters,
  discoveryFiltersSchema,
  type DiscoveryFilters,
} from './discovery.types';

type DiscoveryState = {
  filters: DiscoveryFilters;
  setFilters: (filters: DiscoveryFilters) => void;
  resetFilters: () => void;
};

export const discoveryStorageKey = 'photomatch.discovery.filters.v2';

export function toDiscoveryPersistedState(state: DiscoveryState) {
  return {
    filters: discoveryFiltersSchema.parse(state.filters),
  };
}

export const useDiscoveryStore = create<DiscoveryState>()(
  persist(
    (set) => ({
      filters: defaultDiscoveryFilters,
      setFilters: (filters) =>
        set({ filters: discoveryFiltersSchema.parse(filters) }),
      resetFilters: () => set({ filters: defaultDiscoveryFilters }),
    }),
    {
      name: discoveryStorageKey,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: toDiscoveryPersistedState,
      migrate: (persisted) => {
        const saved = persisted as Partial<DiscoveryState> | undefined;
        return {
          ...saved,
          filters: discoveryFiltersSchema.parse({
            ...saved?.filters,
            nearbyOnly: false,
          }),
        };
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<DiscoveryState> | undefined;
        const parsed = discoveryFiltersSchema.safeParse(saved?.filters);
        return {
          ...current,
          filters: parsed.success ? parsed.data : defaultDiscoveryFilters,
        };
      },
    },
  ),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  defaultNearbyFilters,
  nearbyFiltersSchema,
  type NearbyFilters,
} from './nearby.types';

type NearbyState = {
  filters: NearbyFilters;
  setFilters: (filters: NearbyFilters) => void;
  resetFilters: () => void;
};

export const nearbyStorageKey = 'photomatch.nearby.filters.v1';

export function toNearbyPersistedState(state: NearbyState) {
  return {
    filters: nearbyFiltersSchema.parse(state.filters),
  };
}

export const useNearbyStore = create<NearbyState>()(
  persist(
    (set) => ({
      filters: defaultNearbyFilters,
      setFilters: (filters) =>
        set({ filters: nearbyFiltersSchema.parse(filters) }),
      resetFilters: () => set({ filters: defaultNearbyFilters }),
    }),
    {
      name: nearbyStorageKey,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: toNearbyPersistedState,
      merge: (persisted, current) => {
        const saved = persisted as Partial<NearbyState> | undefined;
        const parsed = nearbyFiltersSchema.safeParse(saved?.filters);
        return {
          ...current,
          filters: parsed.success ? parsed.data : defaultNearbyFilters,
        };
      },
    },
  ),
);

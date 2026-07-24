import { create } from 'zustand';

type AccountState = {
  roleId: string | null;
  setRoleId: (roleId: string | null) => void;
  reset: () => void;
};

export const useAccountStore = create<AccountState>((set) => ({
  roleId: null,
  setRoleId: (roleId) => set({ roleId }),
  reset: () => set({ roleId: null }),
}));

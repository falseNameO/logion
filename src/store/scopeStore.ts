import { create } from 'zustand';
import type { ScopeConfig } from '../types';

interface ScopeStore {
  activeScope: ScopeConfig | null;
  setScope: (scope: ScopeConfig) => void;
  clearScope: () => void;
}

export const useScopeStore = create<ScopeStore>()((set) => ({
  activeScope: null,
  setScope: (scope) => set({ activeScope: scope }),
  clearScope: () => set({ activeScope: null }),
}));

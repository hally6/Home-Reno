import { create } from 'zustand';

type CacheEntry = {
  data: unknown;
  updatedAt: number;
};

type QueryCacheState = {
  entries: Record<string, CacheEntry>;
  setEntry: (key: string, data: unknown) => void;
  clearEntry: (key: string) => void;
  clearAll: () => void;
};

export const useQueryCacheStore = create<QueryCacheState>((set) => ({
  entries: {},
  setEntry: (key, data) =>
    set((state) => ({
      entries: {
        ...state.entries,
        [key]: { data, updatedAt: Date.now() }
      }
    })),
  clearEntry: (key) =>
    set((state) => {
      const nextEntries = { ...state.entries };
      delete nextEntries[key];
      return { entries: nextEntries };
    }),
  clearAll: () => set({ entries: {} })
}));

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as FileSystem from 'expo-file-system/legacy';
import type { StateStorage } from 'zustand/middleware';

// ─── FileSystem-backed StateStorage adapter ───────────────────────────────────
// Zustand's persist middleware requires a StateStorage (getItem/setItem/removeItem).
// We implement it over expo-file-system so no extra package is needed.

const storageDir = `${FileSystem.documentDirectory}store/`;

function storePath(key: string): string {
  return `${storageDir}${key}.json`;
}

async function ensureStoreDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(storageDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(storageDir, { intermediates: true });
  }
}

const fileStorage: StateStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const path = storePath(key);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return FileSystem.readAsStringAsync(path);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    await ensureStoreDir();
    await FileSystem.writeAsStringAsync(storePath(key), value);
  },

  removeItem: async (key: string): Promise<void> => {
    const path = storePath(key);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      await FileSystem.deleteAsync(path, { idempotent: true });
    }
  },
};

// ─── Store ────────────────────────────────────────────────────────────────────

type PronunciationType = 'erasmian' | 'koine';

interface SettingsStore {
  pronunciationType: PronunciationType;
  darkMode: boolean;
  setPronunciation: (type: PronunciationType) => void;
  toggleDarkMode: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      pronunciationType: 'koine',
      darkMode: false,
      setPronunciation: (type) => set({ pronunciationType: type }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    {
      name: 'logion-settings',
      storage: createJSONStorage(() => fileStorage),
    },
  ),
);

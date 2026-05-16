/**
 * LyricFlow - Art History Store (Zustand)
 * Tracks the last 8 custom cover art image URIs
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ArtHistoryState {
  recentArts: string[];
  addRecentArt: (uri: string) => void;
  removeRecentArt: (uri: string) => void;
  clearHistory: () => void;
}

export const useArtHistoryStore = create<ArtHistoryState>()(
  persist(
    (set) => ({
      recentArts: [],
      
      addRecentArt: (uri) => set((state) => {
        // Remove duplicate if exists and add to start
        const filtered = state.recentArts.filter((art) => art !== uri);
        const newHistory = [uri, ...filtered];
        // Keep only last 8
        return { recentArts: newHistory.slice(0, 8) };
      }),
      
      removeRecentArt: (uri) => set((state) => ({
        recentArts: state.recentArts.filter((art) => art !== uri),
      })),
      
      clearHistory: () => set({ recentArts: [] }),
    }),
    {
      name: 'lyricflow-art-history',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

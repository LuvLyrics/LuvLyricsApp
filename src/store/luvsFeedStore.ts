import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnifiedSong } from '../types/song';

interface LuvsFeedState {
  feedSongs: UnifiedSong[];
  currentIndex: number;
  vault: UnifiedSong[]; // Liked/saved songs for batch download
  isLoading: boolean;
  page: number;
  hasMore: boolean;
  
  // Actions
  setFeedSongs: (songs: UnifiedSong[]) => void;
  appendFeedSongs: (songs: UnifiedSong[]) => void;
  setCurrentIndex: (index: number) => void;
  addToVault: (song: UnifiedSong) => void;
  removeFromVault: (id: string) => void;
  clearVault: () => void;
  setIsLoading: (loading: boolean) => void;
  setPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  isInVault: (id: string) => boolean;
}

export const useLuvsFeedStore = create<LuvsFeedState>()(
  persist(
    (set, get) => ({
      feedSongs: [],
      currentIndex: 0,
      vault: [],
      isLoading: false,
      page: 0,
      hasMore: true,
      
      setFeedSongs: (songs) => set({ feedSongs: songs, page: 0, hasMore: true }),
      
      appendFeedSongs: (songs) => set((state) => ({
        feedSongs: [...state.feedSongs, ...songs],
        page: state.page + 1,
      })),
      
      setCurrentIndex: (index) => set({ currentIndex: index }),
      
      addToVault: (song) => set((state) => {
        // Prevent duplicates
        if (state.vault.find(s => s.id === song.id)) {
          return state;
        }
        return { vault: [...state.vault, song] };
      }),
      
      removeFromVault: (id) => set((state) => ({
        vault: state.vault.filter(s => s.id !== id),
      })),
      
      clearVault: () => set({ vault: [] }),
      
      setIsLoading: (loading) => set({ isLoading: loading }),
      
      setPage: (page) => set({ page }),
      
      setHasMore: (hasMore) => set({ hasMore }),
      
      isInVault: (id) => {
        const state = get();
        return state.vault.some(s => s.id === id);
      },
    }),
    {
      name: 'lyricflow-reels-feed', // Keep legacy key for data
      storage: createJSONStorage(() => AsyncStorage),
      // Persist feed state and vault for instant resumption
      partialize: (state) => ({ 
        feedSongs: state.feedSongs,
        currentIndex: state.currentIndex,
        vault: state.vault 
      }),
    }
  )
);

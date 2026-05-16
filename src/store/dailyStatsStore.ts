/**
 * LyricFlow - Daily Stats Store (Zustand)
 * Tracks song plays per day to determine "Most Heard Yesterday"
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startOfDay, subDays, format } from 'date-fns';

interface DailyStatsState {
  // Map of date (YYYY-MM-DD) -> { songId: playCount }
  dailyPlays: Record<string, Record<string, number>>;
  
  incrementDailyPlay: (songId: string) => void;
  getTopSongOfYesterday: () => string | null;
  getTopSongOfToday: () => string | null;
  resetStats: () => void;
}

export const useDailyStatsStore = create<DailyStatsState>()(
  persist(
    (set, get) => ({
      dailyPlays: {},

      incrementDailyPlay: (songId: string) => {
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        
        set((state) => {
          const currentDayStats = state.dailyPlays[today] || {};
          const currentCount = currentDayStats[songId] || 0;
          
          return {
            dailyPlays: {
              ...state.dailyPlays,
              [today]: {
                ...currentDayStats,
                [songId]: currentCount + 1,
              },
            },
          };
        });
        
        // Optional: Prune old entries (older than 7 days) to save space?
        // keeping it simple for now.
      },

      getTopSongOfYesterday: () => {
        const yesterday = format(subDays(startOfDay(new Date()), 1), 'yyyy-MM-dd');
        return getTopSongForDate(get().dailyPlays, yesterday);
      },

      getTopSongOfToday: () => {
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        return getTopSongForDate(get().dailyPlays, today);
      },

      resetStats: () => set({ dailyPlays: {} }),
    }),
    {
      name: 'lyricflow-daily-stats',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Helper to find top song in a PlayRecord map
const getTopSongForDate = (dailyPlays: Record<string, Record<string, number>>, dateKey: string): string | null => {
  const dayStats = dailyPlays[dateKey];
  if (!dayStats) return null;

  let topSongId: string | null = null;
  let maxPlays = 0;

  for (const [songId, count] of Object.entries(dayStats)) {
    if (count > maxPlays) {
      maxPlays = count;
      topSongId = songId;
    }
  }

  return topSongId;
};

import { create } from 'zustand';
import { UnifiedSong } from '../types/song';
import { downloadManager } from '../services/DownloadManager';

export interface QueueItem {
  id: string; // song ID
  song: UnifiedSong;
  status: 'pending' | 'staging' | 'downloading' | 'completed' | 'failed' | 'paused';
  progress: number;
  stageStatus?: string; // e.g. "Fetching Lyrics...", "Downloading Audio..."
  error?: string;
  targetPlaylistId?: string;
  sortOrder?: number;
}

interface DownloadQueueStore {
  queue: QueueItem[];
  isProcessing: boolean;
  
  addToQueue: (songs: UnifiedSong[], targetPlaylistId?: string, sortOrders?: number[]) => void;
  updateItem: (id: string, updates: Partial<QueueItem>) => void;
  removeItem: (id: string) => void;
  clearCompleted: () => void;
  setProcessing: (isProcessing: boolean) => void;
  
  pauseItem: (id: string) => void;
  resumeItem: (id: string) => void;
  retryItem: (id: string) => void;
}

export const useDownloadQueueStore = create<DownloadQueueStore>((set) => ({
  queue: [],
  isProcessing: false,

  addToQueue: (songs: UnifiedSong[], targetPlaylistId?: string, sortOrders?: number[]) => {
    set(state => {
      // Filter out duplicates
      const newItems = songs
        .filter(s => !state.queue.find(q => q.id === s.id))
        .map((s, index) => ({
          id: s.id,
          song: s,
          status: 'pending' as const,
          progress: 0,
          stageStatus: 'Waiting...',
          targetPlaylistId, // Add playlist ID if provided
          sortOrder: sortOrders ? sortOrders[index] : undefined
        }));
      
      return {
        queue: [...state.queue, ...newItems]
      };
    });
  },

  updateItem: (id: string, updates: Partial<QueueItem>) => {
    set(state => ({
      queue: state.queue.map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  },

  removeItem: (id: string) => {
    set(state => ({
      queue: state.queue.filter(item => item.id !== id)
    }));
  },

  clearCompleted: () => {
    set(state => ({
      queue: state.queue.filter(item => item.status !== 'completed')
    }));
  },

  setProcessing: (isProcessing: boolean) => set({ isProcessing }),

  pauseItem: (id: string) => {
    downloadManager.pauseDownload(id);
    set(state => ({
      queue: state.queue.map(item => 
        item.id === id ? { ...item, status: 'paused', stageStatus: 'Paused' } : item
      )
    }));
  },

  resumeItem: (id: string) => {
    downloadManager.resumeDownload(id);
    set(state => ({
      queue: state.queue.map(item => 
        item.id === id ? { ...item, status: 'pending', stageStatus: 'Resuming...' } : item
      )
    }));
  },

  retryItem: (id: string) => {
    set(state => ({
      queue: state.queue.map(item => 
        item.id === id ? { ...item, status: 'pending', progress: 0, stageStatus: 'Retrying...' } : item
      )
    }));
  }
}));

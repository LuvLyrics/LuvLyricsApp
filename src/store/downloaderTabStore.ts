import { create } from 'zustand';
import { UnifiedSong } from '../types/song';

export interface BulkItem {
  id: string;
  query: { title: string; artist: string };
  result: UnifiedSong | null;
  status: 'pending' | 'searching' | 'found' | 'not_found' | 'already_present';
  originalIndex: number;
}

export interface SearchTab {
  id: string;
  query: string;
  titleQuery: string;   // Per-tab title search text
  artistQuery: string;  // Per-tab artist search text
  results: UnifiedSong[];
  remixResults?: UnifiedSong[]; // Separate remix/cover results for artist search
  scrollPosition: number;
  isSearching: boolean;
  status: string;
  selectedSongs: string[]; // IDs of selected songs in this tab
  
  // Bulk Mode State
  mode: 'search' | 'bulk';
  bulkItems: BulkItem[];
  bulkPlaylistName: string;
}

interface DownloaderTabStore {
  tabs: SearchTab[];
  activeTabId: string;
  
  createTab: (query: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<SearchTab>) => void;
  
  // Selection Logic
  toggleSelection: (tabId: string, songId: string) => void;
  clearAllSelections: () => void;
  getSelectedSongs: () => { song: UnifiedSong, tabId: string }[];
}

export const useDownloaderTabStore = create<DownloaderTabStore>((set, get) => ({
  tabs: [{
    id: 'default',
    query: '',
    titleQuery: '',
    artistQuery: '',
    results: [],
    scrollPosition: 0,
    isSearching: false,
    status: '',
    selectedSongs: [],
    mode: 'search',
    bulkItems: [],
    bulkPlaylistName: ''
  }],
  activeTabId: 'default',

  createTab: (initialQuery: string) => {
    const newTab: SearchTab = {
      id: Date.now().toString(),
      query: initialQuery,
      titleQuery: '',
      artistQuery: initialQuery, // If created from artist click, set artist field
      results: [],
      scrollPosition: 0,
      isSearching: false,
      status: '',
      selectedSongs: [],
      mode: 'search',
      bulkItems: [],
      bulkPlaylistName: ''
    };
    set(state => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }));
  },

  closeTab: (id: string) => {
    set(state => {
      const newTabs = state.tabs.filter(t => t.id !== id);
      // If we closed the active tab, switch to the last one
      const newActiveId = id === state.activeTabId 
        ? newTabs[newTabs.length - 1]?.id || '' 
        : state.activeTabId;
      
      if (newTabs.length === 0) {
          // Always keep one tab open
          return {
              tabs: [{
                id: 'default',
                query: '',
                titleQuery: '',
                artistQuery: '',
                results: [],
                scrollPosition: 0,
                isSearching: false,
                status: '',
                selectedSongs: [],
                mode: 'search',
                bulkItems: [],
                bulkPlaylistName: ''
              }],
              activeTabId: 'default'
          };
      }

      return {
        tabs: newTabs,
        activeTabId: newActiveId
      };
    });
  },

  setActiveTab: (id: string) => set({ activeTabId: id }),

  updateTab: (id: string, updates: Partial<SearchTab>) => {
    set(state => ({
      tabs: state.tabs.map(tab => tab.id === id ? { ...tab, ...updates } : tab)
    }));
  },

  toggleSelection: (tabId: string, songId: string) => {
      set(state => ({
          tabs: state.tabs.map(tab => {
              if (tab.id !== tabId) return tab;
              const selectedSongs = tab.selectedSongs || [];
              const isSelected = selectedSongs.includes(songId);
              return {
                  ...tab,
                  selectedSongs: isSelected 
                    ? selectedSongs.filter(id => id !== songId)
                    : [...selectedSongs, songId]
              };
          })
      }));
  },

  clearAllSelections: () => {
      set(state => ({
          tabs: state.tabs.map(tab => ({ ...tab, selectedSongs: [] }))
      }));
  },

  getSelectedSongs: () => {
      const state = get();
      const allSelected: { song: UnifiedSong, tabId: string }[] = [];
      
      state.tabs.forEach(tab => {
          (tab.selectedSongs || []).forEach(songId => {
              // Check in regular search results
              let song = tab.results.find(s => s.id === songId);
              
              // Also check in bulk items if not found
              if (!song && tab.bulkItems) {
                  const bulkItem = tab.bulkItems.find(i => i.result?.id === songId);
                  if (bulkItem) song = bulkItem.result || undefined;
              }

              if (song) {
                  allSelected.push({ song, tabId: tab.id });
              }
          });
      });
      return allSelected;
  }
}));

import { useMemo } from 'react';
import { Song } from '../types/song';

export type SortOption = 'custom' | 'title' | 'artist' | 'date' | 'recent';
export type SortDirection = 'asc' | 'desc';

export function useSortedSongs(
  songs: Song[],
  query: string,
  sortBy: SortOption = 'recent',
  sortDirection: SortDirection = 'desc'
): Song[] {
  return useMemo(() => {
    let result = [...songs];

    // 1. Filter
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist?.toLowerCase().includes(q) ||
          s.album?.toLowerCase().includes(q)
      );
    }

    // 2. Sort
    if (sortBy !== 'custom') {
      result.sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';

        switch (sortBy) {
          case 'title':
            valA = a.title.toLowerCase();
            valB = b.title.toLowerCase();
            break;
          case 'artist':
            valA = (a.artist || '').toLowerCase();
            valB = (b.artist || '').toLowerCase();
            break;
          case 'date':
          case 'recent':
            valA = a.dateCreated ? new Date(a.dateCreated).getTime() : 0;
            valB = b.dateCreated ? new Date(b.dateCreated).getTime() : 0;
            break;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [songs, query, sortBy, sortDirection]);
}

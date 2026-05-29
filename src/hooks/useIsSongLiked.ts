import { usePlaylistStore } from '../store/playlistStore';

/**
 * Derived isLiked status — single source of truth is playlistStore.likedSongIds.
 * Using this hook instead of song.isLiked prevents inconsistencies when the
 * toggle path updates multiple stores.
 */
export function useIsSongLiked(songId: string | undefined): boolean {
  return usePlaylistStore(state => songId ? state.likedSongIds.has(songId) : false);
}

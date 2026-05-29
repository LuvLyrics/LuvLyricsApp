import { useCallback } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { useSongsStore } from '../store/songsStore';
import { Song } from '../types/song';

interface UsePlaybackQueueOptions {
  playlistId?: string;
  playInMiniPlayerOnly?: boolean;
  setMiniPlayerHidden: (hidden: boolean) => void;
  navigation?: any;
}

/**
 * Stable playSong callback that handles queue setup and navigation.
 * Extracted from LibraryScreen / PlaylistDetailScreen to remove duplication.
 */
export function usePlaybackQueue(options: UsePlaybackQueueOptions) {
  const { playlistId, playInMiniPlayerOnly, setMiniPlayerHidden, navigation } = options;
  const setCurrentSong = useSongsStore(state => state.setCurrentSong);

  const playSong = useCallback((song: Song, visibleSongs: Song[], allSongs: Song[]) => {
    const playerState = usePlayerStore.getState();
    const currentId = playerState.currentSongId;
    const loadedId = playerState.loadedAudioId;
    const isCurrentlyPlaying = currentId === song.id || loadedId === song.id;

    const index = visibleSongs.findIndex(s => s.id === song.id);

    if (playInMiniPlayerOnly) {
      if (isCurrentlyPlaying) {
        setMiniPlayerHidden(true);
        navigation?.navigate('NowPlaying', { songId: song.id });
      } else {
        if (index !== -1) {
          usePlayerStore.getState().setPlaylistQueue(playlistId || 'library', visibleSongs, index);
          setCurrentSong(song);
        } else {
          const fallbackIndex = allSongs.findIndex(s => s.id === song.id);
          if (fallbackIndex !== -1) {
            usePlayerStore.getState().setPlaylistQueue(playlistId || 'library', allSongs, fallbackIndex);
          } else {
            setCurrentSong(song);
            usePlayerStore.getState().setInitialSong(song);
            usePlayerStore.getState().loadSong(song.id);
          }
        }
      }
    } else {
      setMiniPlayerHidden(true);
      if (isCurrentlyPlaying) {
        navigation?.navigate('NowPlaying', { songId: song.id });
      } else {
        if (index !== -1) {
          usePlayerStore.getState().setPlaylistQueue(playlistId || 'library', visibleSongs, index);
        } else {
          const fallbackIdx = allSongs.findIndex(s => s.id === song.id);
          if (fallbackIdx !== -1) {
            usePlayerStore.getState().setPlaylistQueue(playlistId || 'library', allSongs, fallbackIdx);
          } else {
            usePlayerStore.getState().setInitialSong(song);
            usePlayerStore.getState().loadSong(song.id);
          }
        }
        navigation?.navigate('NowPlaying', { songId: song.id });
      }
    }
  }, [playlistId, playInMiniPlayerOnly, setMiniPlayerHidden, navigation, setCurrentSong]);

  return playSong;
}

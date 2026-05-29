import { Platform } from 'react-native';
import { Song } from '../types/song';
import { Playlist } from '../types/song';

export interface PreloadedData {
  songs: Song[];
  playlists: Playlist[];
  lastPlayedId?: string;
}

export async function getPreloadedData(): Promise<PreloadedData | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const { requireNativeModule } = await import('expo-modules-core');
    const mod = requireNativeModule('Startup');
    const json: string | null = await mod.getPreloadedData();
    if (!json) return null;
    return JSON.parse(json) as PreloadedData;
  } catch {
    return null;
  }
}

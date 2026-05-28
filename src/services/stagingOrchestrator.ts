import { UnifiedSong } from '../types/song';
import { lyricaService, LyricaResult, getLyricsFriendlyError } from './LyricaService';
import { ImageSearchService } from './ImageSearchService';

const cleanTerm = (text: string) =>
  text
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\b(ft|feat|featuring|official|video|audio|lyrics)\b.*/gi, '')
    .trim();

/**
 * Fetch iTunes cover art URLs for a song.
 * Falls back to source art if iTunes returns nothing.
 * Pure async — no React state, fully testable.
 */
export async function fetchCoverArt(song: UnifiedSong): Promise<string[]> {
  try {
    const query = `${song.title} ${song.artist}`;
    let urls = await ImageSearchService.searchItunes(query);

    if (urls.length === 0) {
      const cleanQuery = `${cleanTerm(song.title)} ${cleanTerm(song.artist)}`;
      if (cleanQuery !== query) {
        urls = await ImageSearchService.searchItunes(cleanQuery);
      }
    }

    if (urls.length > 0) return urls;
  } catch {
    // fall through to source art
  }

  return song.highResArt ? [song.highResArt] : [];
}

export interface LyricsFetchResult {
  results: LyricaResult[];
  error: string | null;
}

/**
 * Fetch lyrics for a staged song, respecting an AbortSignal.
 * Replaces the DIY isActive boolean with proper cancellation.
 * Pure async — no React state, fully testable.
 */
export async function fetchStagingLyrics(
  title: string,
  artist: string,
  duration: number,
  signal: AbortSignal
): Promise<LyricsFetchResult> {
  try {
    const raw = await lyricaService.fetchLyrics(title, artist, false, duration);

    if (signal.aborted) return { results: [], error: null };

    if (!raw) {
      return {
        results: [],
        error: 'No lyrics found for this song. Try title/artist edit and retry.',
      };
    }

    return { results: [raw], error: null };
  } catch (e: unknown) {
    if (signal.aborted) return { results: [], error: null };
    return { results: [], error: getLyricsFriendlyError(e) };
  }
}

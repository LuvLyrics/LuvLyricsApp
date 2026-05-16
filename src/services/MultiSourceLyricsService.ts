import { lyricaService, LyricaResult } from './LyricaService';
import { LrcLibService } from './LrcLibService';
import { JioSaavnLyricsService } from './JioSaavnLyricsService';
import { GeniusService } from './GeniusService';
import { UnifiedSong } from '../types/song';

/**
 * Service to race multiple lyric providers and aggregate results
 * User Requirement: "Show all lyrics so they can preview and select"
 */
export const MultiSourceLyricsService = {
    
    fetchLyricsParallel: async (title: string, artist: string, duration?: number): Promise<LyricaResult[]> => {
        try {
            console.log(`[LyricsEngine] 🔒 Restricted to Lyrica Only (Slowed > Fast > Plain)`);
            
            // Lyrica Service (Handles Strategy Internally)
            const result = await lyricaService.fetchLyrics(title, artist, false, duration);
            
            if (result) {
                return [result];
            }
            
            return [];
        } catch (error) {
             console.error('[LyricsEngine] Critical failure in fetchLyricsParallel:', error);
             return [];
        }
    }
};

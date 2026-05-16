/**
 * Smart Lyric Matcher
 * Algorithm to rank and select the best lyrics from LRCLIB results
 */

import stringSimilarity from 'string-similarity';
import { LrcLibTrack } from './LrcLibService';

export interface ScoredResult extends LrcLibTrack {
  matchScore: number;
  matchReason: string;
}

export const SmartLyricMatcher = {
  /**
   * Calculate match score (0-100)
   */
  calculateScore: (
    result: LrcLibTrack, 
    userLyrics: string | null, 
    targetValues: { title: string; artist: string; duration: number }
  ): ScoredResult => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Metadata Match (Title/Artist) - 30% weight
    // Basic fuzzy check just to ensure it's not completely wrong song
    // (LRCLIB search handles this mostly, but we verify)
    const titleSim = stringSimilarity.compareTwoStrings(result.trackName.toLowerCase(), targetValues.title.toLowerCase());
    if (titleSim > 0.8) {
      score += 30;
      reasons.push('Title match');
    } else if (titleSim > 0.5) {
      score += 15;
    }

    // 2. Synced Status - 20% weight
    if (result.syncedLyrics) {
      score += 20;
      reasons.push('Synced');
    }

    // 3. User Lyrics Similarity (The "Smart" Part) - 40% weight
    // If user provided text, compare it with plainLyrics
    if (userLyrics && userLyrics.length > 50 && result.plainLyrics) {
      // Compare first 300 chars to save perf (usually enough for chorus/verse check)
      const similarity = stringSimilarity.compareTwoStrings(
        userLyrics.substring(0, 500).toLowerCase(), 
        result.plainLyrics.substring(0, 500).toLowerCase()
      );
      
      const similarityPoints = Math.round(similarity * 40);
      score += similarityPoints;
      
      if (similarity > 0.7) {
        reasons.push(`${Math.round(similarity * 100)}% Lyric Match`);
      }
    } else {
       // If no user lyrics, redistribute weight to duration
       // (Handled below by bonus)
    }

    // 4. Duration Match - 10% weight (or more if no lyrics)
    if (targetValues.duration > 0) {
      const delta = Math.abs(result.duration - targetValues.duration);
      if (delta <= 2) {
        score += 10;
        reasons.push('Exact duration');
      } else if (delta <= 10) {
        score += 5;
      }
    }

    // Cap at 100
    score = Math.min(100, score);

    return {
      ...result,
      matchScore: score,
      matchReason: reasons.join(' • ')
    };
  },

  /**
   * Sort results by score
   */
  rankResults: (results: ScoredResult[]): ScoredResult[] => {
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
};

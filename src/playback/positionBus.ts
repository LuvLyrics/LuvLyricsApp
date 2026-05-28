import { makeMutable } from 'react-native-reanimated';

export const positionSV = makeMutable(0);
export const durationSV = makeMutable(0);
// Set to true during scrub/seek to pause position updates from PlayerContext
export const isSeeking = makeMutable(false);

/**
 * Format a seconds value as M:SS — safe to call from a Reanimated worklet.
 */
export function formatTimeSV(seconds: number): string {
  'worklet';
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const secsStr = secs < 10 ? `0${secs}` : `${secs}`;
  return `${mins}:${secsStr}`;
}

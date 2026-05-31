import { SmartLyricMatcher } from './SmartLyricMatcher';
import { LrcLibTrackResponse } from '../types/providerResponses';

type Track = LrcLibTrackResponse;

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 1,
    trackName: 'Blinding Lights',
    artistName: 'The Weeknd',
    albumName: 'After Hours',
    duration: 200,
    instrumental: false,
    plainLyrics: '',
    syncedLyrics: '',
    ...overrides,
  };
}

const target = { title: 'Blinding Lights', artist: 'The Weeknd', duration: 200 };

// ── Title match weight (30 pts) ───────────────────────────────────────────────

describe('title matching', () => {
  it('awards 30 pts for near-identical title', () => {
    const result = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Blinding Lights' }),
      null,
      target,
    );
    expect(result.matchScore).toBeGreaterThanOrEqual(30);
    expect(result.matchReason).toContain('Title match');
  });

  it('awards partial pts for somewhat similar title', () => {
    const result = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Blinding Light (remix)' }),
      null,
      { ...target, duration: 0 },
    );
    expect(result.matchScore).toBeGreaterThanOrEqual(15);
  });

  it('awards 0 title pts for completely different title', () => {
    const result = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Bohemian Rhapsody' }),
      null,
      { ...target, duration: 0 },
    );
    expect(result.matchScore).toBe(0);
  });
});

// ── Synced lyrics weight (20 pts) ─────────────────────────────────────────────

describe('synced lyrics bonus', () => {
  it('awards 20 pts when syncedLyrics is present', () => {
    const withSynced = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Other Song', syncedLyrics: '[00:01.00] Hello' }),
      null,
      { ...target, title: 'Other Song', duration: 0 },
    );
    const withoutSynced = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Other Song', syncedLyrics: '' }),
      null,
      { ...target, title: 'Other Song', duration: 0 },
    );
    expect(withSynced.matchScore - withoutSynced.matchScore).toBe(20);
    expect(withSynced.matchReason).toContain('Synced');
  });
});

// ── User lyrics similarity weight (40 pts) ────────────────────────────────────

describe('user lyrics similarity', () => {
  const longLyrics = 'I been runnin out of time since you been gone away I just needed you to stay oh oh oh'.repeat(3);

  it('awards similarity points when user lyrics closely match plainLyrics', () => {
    const result = SmartLyricMatcher.calculateScore(
      makeTrack({ plainLyrics: longLyrics }),
      longLyrics,
      { ...target, duration: 0 },
    );
    // Identical text → near-40 pts
    expect(result.matchScore).toBeGreaterThanOrEqual(60);
    expect(result.matchReason).toContain('% Lyric Match');
  });

  it('skips user lyric comparison when userLyrics is null', () => {
    const result = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Other', plainLyrics: longLyrics }),
      null,
      { title: 'Other', artist: 'x', duration: 0 },
    );
    // Only title pts for partial match, no lyric pts
    expect(result.matchScore).toBeLessThan(40);
  });

  it('skips comparison when userLyrics is too short (< 50 chars)', () => {
    const result = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Other', plainLyrics: longLyrics }),
      'short',
      { title: 'Other', artist: 'x', duration: 0 },
    );
    expect(result.matchScore).toBeLessThan(40);
  });
});

// ── Duration match weight (10 pts) ────────────────────────────────────────────

describe('duration matching', () => {
  it('awards 10 pts when delta <= 2 seconds', () => {
    const exact = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'X', duration: 200 }),
      null,
      { title: 'X', artist: 'x', duration: 200 },
    );
    const close = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'X', duration: 201 }),
      null,
      { title: 'X', artist: 'x', duration: 200 },
    );
    expect(exact.matchReason).toContain('Exact duration');
    expect(close.matchReason).toContain('Exact duration');
  });

  it('awards 5 pts when delta is 3–10 seconds', () => {
    const near = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Completely Different Title Here', duration: 207 }),
      null,
      { title: 'Unrelated Song Name', artist: 'x', duration: 200 },
    );
    expect(near.matchReason).not.toContain('Exact duration');
    // 5 duration pts only — titles are unrelated so no title pts
    expect(near.matchScore).toBe(5);
  });

  it('awards 0 duration pts when delta > 10 seconds', () => {
    const far = SmartLyricMatcher.calculateScore(
      makeTrack({ trackName: 'Completely Different Title Here', duration: 250 }),
      null,
      { title: 'Unrelated Song Name', artist: 'x', duration: 200 },
    );
    expect(far.matchScore).toBe(0);
  });
});

// ── Score cap ────────────────────────────────────────────────────────────────

describe('score cap', () => {
  it('never exceeds 100', () => {
    const longLyrics = 'lyrics '.repeat(100);
    const result = SmartLyricMatcher.calculateScore(
      makeTrack({ syncedLyrics: '[00:01.00] x', plainLyrics: longLyrics, duration: 200 }),
      longLyrics,
      target,
    );
    expect(result.matchScore).toBeLessThanOrEqual(100);
  });
});

// ── rankResults ───────────────────────────────────────────────────────────────

describe('rankResults', () => {
  it('sorts by matchScore descending', () => {
    const a = { ...makeTrack(), matchScore: 40, matchReason: '' };
    const b = { ...makeTrack(), matchScore: 90, matchReason: '' };
    const c = { ...makeTrack(), matchScore: 60, matchReason: '' };

    const ranked = SmartLyricMatcher.rankResults([a, b, c]);
    expect(ranked.map(r => r.matchScore)).toEqual([90, 60, 40]);
  });
});

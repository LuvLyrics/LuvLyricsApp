import { songHasAnyLyrics, songHasSyncedLyrics, songCanUpgradeToSyncedLyrics } from './lyricsState';
import { Song } from '../types/song';

function makeSong(lyrics: Song['lyrics']): Song {
  return {
    id: '1',
    title: 'Test',
    gradientId: '1',
    duration: 180,
    dateCreated: '',
    dateModified: '',
    playCount: 0,
    lyrics,
  };
}

const noLyrics = makeSong([]);
const plainLyrics = makeSong([
  { timestamp: 0, text: 'Hello world', lineOrder: 0 },
  { timestamp: 0, text: 'Second line', lineOrder: 1 },
]);
const syncedLyrics = makeSong([
  { timestamp: 1.5, text: 'First line', lineOrder: 0 },
  { timestamp: 4.0, text: 'Second line', lineOrder: 1 },
]);
const mixedLyrics = makeSong([
  { timestamp: 0, text: 'Unsynced line', lineOrder: 0 },
  { timestamp: 3.0, text: 'Synced line', lineOrder: 1 },
]);

// ── songHasAnyLyrics ─────────────────────────────────────────────────────────

describe('songHasAnyLyrics', () => {
  it('returns false for empty lyrics array', () => {
    expect(songHasAnyLyrics(noLyrics)).toBe(false);
  });

  it('returns true for plain (timestamp=0) lyrics', () => {
    expect(songHasAnyLyrics(plainLyrics)).toBe(true);
  });

  it('returns true for synced lyrics', () => {
    expect(songHasAnyLyrics(syncedLyrics)).toBe(true);
  });
});

// ── songHasSyncedLyrics ──────────────────────────────────────────────────────

describe('songHasSyncedLyrics', () => {
  it('returns false when lyrics array is empty', () => {
    expect(songHasSyncedLyrics(noLyrics)).toBe(false);
  });

  it('returns false when all timestamps are 0', () => {
    expect(songHasSyncedLyrics(plainLyrics)).toBe(false);
  });

  it('returns true when at least one line has timestamp > 0', () => {
    expect(songHasSyncedLyrics(syncedLyrics)).toBe(true);
    expect(songHasSyncedLyrics(mixedLyrics)).toBe(true);
  });
});

// ── songCanUpgradeToSyncedLyrics ─────────────────────────────────────────────

describe('songCanUpgradeToSyncedLyrics', () => {
  it('returns false when no lyrics exist', () => {
    expect(songCanUpgradeToSyncedLyrics(noLyrics)).toBe(false);
  });

  it('returns false when already synced', () => {
    expect(songCanUpgradeToSyncedLyrics(syncedLyrics)).toBe(false);
  });

  it('returns true when plain lyrics exist but no timestamps', () => {
    expect(songCanUpgradeToSyncedLyrics(plainLyrics)).toBe(true);
  });

  it('returns false for mixed (partially synced) — already has synced', () => {
    expect(songCanUpgradeToSyncedLyrics(mixedLyrics)).toBe(false);
  });
});

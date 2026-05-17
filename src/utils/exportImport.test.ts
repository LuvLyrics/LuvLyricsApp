jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('expo-document-picker', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('../database/queries', () => ({
  getAllSongsWithLyrics: jest.fn(),
  insertSong: jest.fn(),
  clearAllData: jest.fn(),
}));

import { sanitizeFilename } from './exportImport';

describe('sanitizeFilename', () => {

  // ── Happy path ─────────────────────────────────────────────────────
  it('leaves clean names untouched', () => {
    expect(sanitizeFilename('lyricflow-backup-1234567890')).toBe('lyricflow-backup-1234567890');
  });

  // ── Reserved characters ────────────────────────────────────────────
  it('replaces colon', () => {
    expect(sanitizeFilename('My Song: Vol. 2')).toBe('My Song_ Vol. 2');
  });

  it('replaces forward slash', () => {
    expect(sanitizeFilename('AC/DC Greatest')).toBe('AC_DC Greatest');
  });

  it('replaces backslash', () => {
    expect(sanitizeFilename('path\\to\\song')).toBe('path_to_song');
  });

  it('replaces all Windows-reserved chars', () => {
    expect(sanitizeFilename('a\\b/c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });

  // ── Control characters ─────────────────────────────────────────────
  it('strips control characters', () => {
    expect(sanitizeFilename('Song\x00Name\x1f')).toBe('SongName');
  });

  // ── Trailing dots and spaces ───────────────────────────────────────
  it('trims trailing spaces', () => {
    expect(sanitizeFilename('My Song   ')).toBe('My Song');
  });

  it('trims trailing dots', () => {
    expect(sanitizeFilename('My Song...')).toBe('My Song');
  });

  it('trims mixed trailing dots and spaces', () => {
    expect(sanitizeFilename('My Song . . ')).toBe('My Song');
  });

  // ── Long names ─────────────────────────────────────────────────────
  it('truncates names over 200 characters', () => {
    const result = sanitizeFilename('a'.repeat(250));
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('does not end with a dot after truncation', () => {
    const result = sanitizeFilename('a'.repeat(198) + '..');
    expect(result.endsWith('.')).toBe(false);
  });

  // ── Edge cases ─────────────────────────────────────────────────────
  it('returns fallback for empty string', () => {
    expect(sanitizeFilename('')).toBe('export');
  });

  it('returns fallback when input is only dots and spaces', () => {
    expect(sanitizeFilename('   ...')).toBe('export');
  });

  // ── Determinism ────────────────────────────────────────────────────
  it('produces identical output on repeated calls', () => {
    const input = 'Tum Hi Ho: Reprise / Final*';
    expect(sanitizeFilename(input)).toBe(sanitizeFilename(input));
  });

});
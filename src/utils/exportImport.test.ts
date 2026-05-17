jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
  },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('../database/queries', () => ({
  getAllSongsWithLyrics: jest.fn(),
  insertSong: jest.fn(),
  clearAllData: jest.fn(),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { getAllSongsWithLyrics } from '../database/queries';
import { exportAllSongs, sanitizeFilename } from './exportImport';

const mockedWriteAsStringAsync = jest.mocked(FileSystem.writeAsStringAsync);
const mockedGetAllSongsWithLyrics = jest.mocked(getAllSongsWithLyrics);

describe('sanitizeFilename', () => {
  it('leaves clean names untouched', () => {
    expect(sanitizeFilename('lyricflow-backup-1234567890')).toBe('lyricflow-backup-1234567890');
  });

  it('replaces colon', () => {
    expect(sanitizeFilename('My Song: Vol. 2')).toBe('My Song_ Vol. 2');
  });

  it('replaces forward slash', () => {
    expect(sanitizeFilename('AC/DC Greatest')).toBe('AC_DC Greatest');
  });

  it('replaces backslash', () => {
    expect(sanitizeFilename('path\\to\\song')).toBe('path_to_song');
  });

  it('replaces all Windows-reserved characters', () => {
    expect(sanitizeFilename('a\\b/c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });

  it('strips control characters', () => {
    expect(sanitizeFilename('Song\x00Name\x1f')).toBe('SongName');
  });

  it('trims trailing spaces', () => {
    expect(sanitizeFilename('My Song   ')).toBe('My Song');
  });

  it('trims trailing dots', () => {
    expect(sanitizeFilename('My Song...')).toBe('My Song');
  });

  it('trims mixed trailing dots and spaces', () => {
    expect(sanitizeFilename('My Song . . ')).toBe('My Song');
  });

  it('truncates names over 200 characters', () => {
    const result = sanitizeFilename('a'.repeat(250));
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it('does not end with a dot after truncation', () => {
    const result = sanitizeFilename('a'.repeat(198) + '..');
    expect(result.endsWith('.')).toBe(false);
  });

  it('returns fallback for empty string', () => {
    expect(sanitizeFilename('')).toBe('export');
  });

  it('returns fallback when input is only dots and spaces', () => {
    expect(sanitizeFilename('   ...')).toBe('export');
  });

  it('returns fallback for Windows device names', () => {
    expect(sanitizeFilename('CON')).toBe('export');
    expect(sanitizeFilename('LPT1.txt')).toBe('export');
  });

  it('produces identical output on repeated calls', () => {
    const input = 'Tum Hi Ho: Reprise / Final*';
    expect(sanitizeFilename(input)).toBe(sanitizeFilename(input));
  });
});

describe('exportAllSongs', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockedWriteAsStringAsync.mockReset();
    mockedGetAllSongsWithLyrics.mockReset();
  });

  it('writes the export payload to a sanitized filename', async () => {
    mockedGetAllSongsWithLyrics.mockResolvedValue([
      {
        id: 'song-1',
        title: 'Test Song',
        artist: 'Test Artist',
        lyrics: 'Hello world',
      },
    ] as any);
    mockedWriteAsStringAsync.mockResolvedValue();
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2026-05-17T10:11:12.345Z');

    const fileUri = await exportAllSongs();

    expect(fileUri).toBe('file:///documents/lyricflow-backup-2026-05-17T10_11_12.345Z.json');
    expect(mockedWriteAsStringAsync).toHaveBeenCalledWith(
      'file:///documents/lyricflow-backup-2026-05-17T10_11_12.345Z.json',
      expect.stringContaining('"exportDate": "2026-05-17T10:11:12.345Z"'),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
  });
});

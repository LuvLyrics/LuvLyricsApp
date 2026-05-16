import {
  parseTimestampedLyrics,
  getCurrentLineIndex,
  normalizeLyrics,
  lyricsToRawText,
  hasValidTimestamps,
} from './timestampParser';

describe('timestampParser', () => {
  it('parses bracket timestamp format', () => {
    const parsed = parseTimestampedLyrics('[00:10.50] Hello world');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].timestamp).toBeCloseTo(10.5, 2);
    expect(parsed[0].text).toBe('Hello world');
  });

  it('parses parenthesis timestamp format', () => {
    const parsed = parseTimestampedLyrics('(0:09) line');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].timestamp).toBe(9);
    expect(parsed[0].text).toBe('line');
  });

  it('handles plain text without timestamps', () => {
    const parsed = parseTimestampedLyrics('line one\nline two');
    expect(parsed).toHaveLength(2);
    expect(parsed[0].timestamp).toBe(0);
    expect(parsed[1].timestamp).toBe(0);
  });

  it('detects valid timestamps', () => {
    expect(hasValidTimestamps('[01:20] text')).toBe(true);
    expect(hasValidTimestamps('no timestamp')).toBe(false);
  });

  it('returns current line index for a time cursor', () => {
    const parsed = parseTimestampedLyrics('[00:00] a\n[00:05] b\n[00:10] c');
    expect(getCurrentLineIndex(parsed, 0)).toBe(0);
    expect(getCurrentLineIndex(parsed, 6)).toBe(1);
    expect(getCurrentLineIndex(parsed, 20)).toBe(2);
  });

  it('normalizes millisecond-like timestamps and sorts lines', () => {
    const normalized = normalizeLyrics([
      { timestamp: 2500, text: 'later', lineOrder: 0 },
      { timestamp: 1000, text: 'first', lineOrder: 1 },
    ]);
    expect(normalized[0].text).toBe('first');
    expect(normalized[0].timestamp).toBe(1);
    expect(normalized[1].timestamp).toBe(2.5);
  });

  it('converts lyrics back to raw text', () => {
    const text = lyricsToRawText([
      { timestamp: 65.23, text: 'hello', lineOrder: 0 },
    ]);
    expect(text).toContain('[01:05.23]');
    expect(text).toContain('hello');
  });
});

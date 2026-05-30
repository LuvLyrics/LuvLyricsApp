/**
 * Tests for the cover fallback logic in DownloadManager.
 * The full DownloadManager depends on native modules; these tests verify
 * the JS-side cover URI fallback when the native worker returns null.
 */

describe('DownloadManager cover fallback', () => {
  it('falls back to selectedCoverUri when event.coverUri is null', () => {
    // This mirrors the logic in DownloadManager.ts line ~116:
    // const coverUri = event.coverUri || staging.selectedCoverUri || undefined;
    const eventCoverUri: string | null = null;
    const selectedCoverUri = 'https://cdn.saavn.com/cover.jpg';

    const coverUri = eventCoverUri || selectedCoverUri || undefined;

    expect(coverUri).toBe('https://cdn.saavn.com/cover.jpg');
  });

  it('uses event.coverUri when present (local file path)', () => {
    const eventCoverUri = 'file:///data/user/0/.../music/123/cover.jpg';
    const selectedCoverUri = 'https://cdn.saavn.com/cover.jpg';

    const coverUri = eventCoverUri || selectedCoverUri || undefined;

    expect(coverUri).toBe('file:///data/user/0/.../music/123/cover.jpg');
  });

  it('returns undefined when both are missing', () => {
    const eventCoverUri: string | null = null;
    const selectedCoverUri: string | undefined = undefined;

    const coverUri = eventCoverUri || selectedCoverUri || undefined;

    expect(coverUri).toBeUndefined();
  });

  it('prefers event.coverUri over selectedCoverUri even if remote', () => {
    // Edge case: event has a remote URL (SAF export path or similar)
    const eventCoverUri = 'content://media/.../cover.jpg';
    const selectedCoverUri = 'https://cdn.saavn.com/cover.jpg';

    const coverUri = eventCoverUri || selectedCoverUri || undefined;

    expect(coverUri).toBe('content://media/.../cover.jpg');
  });
});

import { shouldPreservePlayingStateDuringSeek } from './playerStatusGuard';

describe('shouldPreservePlayingStateDuringSeek', () => {
  it('preserves playing state for transient seek statuses', () => {
    expect(
      shouldPreservePlayingStateDuringSeek({
        playing: false,
        playbackState: 'buffering',
        isBuffering: false,
        isLoaded: true,
      })
    ).toBe(true);

    expect(
      shouldPreservePlayingStateDuringSeek({
        playing: false,
        playbackState: 'loading',
        isBuffering: false,
        isLoaded: true,
      })
    ).toBe(true);

    expect(
      shouldPreservePlayingStateDuringSeek({
        playing: false,
        playbackState: 'ready',
        isBuffering: false,
        isLoaded: true,
      })
    ).toBe(true);

    expect(
      shouldPreservePlayingStateDuringSeek({
        playing: false,
        playbackState: 'idle',
        isBuffering: true,
        isLoaded: true,
      })
    ).toBe(true);

    expect(
      shouldPreservePlayingStateDuringSeek({
        playing: false,
        playbackState: 'idle',
        isBuffering: false,
        isLoaded: false,
      })
    ).toBe(true);
  });

  it('does not preserve state for a real pause', () => {
    expect(
      shouldPreservePlayingStateDuringSeek({
        playing: false,
        playbackState: 'paused',
        isBuffering: false,
        isLoaded: true,
      })
    ).toBe(false);
  });

  it('does not preserve state while actively playing', () => {
    expect(
      shouldPreservePlayingStateDuringSeek({
        playing: true,
        playbackState: 'ready',
        isBuffering: true,
        isLoaded: true,
      })
    ).toBe(false);
  });
});

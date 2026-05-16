export const shouldPreservePlayingStateDuringSeek = ({
  playing,
  playbackState,
  isBuffering,
  isLoaded,
}: {
  playing: boolean;
  playbackState: string;
  isBuffering: boolean;
  isLoaded: boolean;
}) =>
  !playing &&
  (isBuffering ||
    playbackState === 'buffering' ||
    playbackState === 'loading' ||
    playbackState === 'ready' ||
    !isLoaded);

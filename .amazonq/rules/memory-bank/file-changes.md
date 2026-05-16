# Recent Implementation Changes

## Lyrica API Integration (Latest)
- **Replaced all scraping services** with unified Lyrica API (`https://test-0k.onrender.com/lyrics`)
- **Waterfall Strategy**: synced-fast → synced-slow → plain text fallback
- **Response Parsing**: Fixed nested `data.data.lyrics` structure
- **Empty Lines**: Converts empty timestamped lines to `[INSTRUMENTAL]`
- **Service**: `src/services/LyricaService.ts`

## Audio Player Fixes
- **PlayerProvider**: Uses `useAudioPlayer` hook, registers player with audioService
- **Play/Pause**: Direct `player.play()` and `player.pause()` calls
- **Position Sync**: Continuous 100ms interval updates (not just when playing)
- **Fixed**: "player: false" errors and scrubber sync issues

## Database Improvements
- **WAL Mode**: Enabled for concurrent read/write access
- **Singleton Pattern**: Promise-based lock prevents multiple initializations
- **Simplified**: Removed complex retry/queue logic causing empty lyrics bug
- **Fixed**: `getSongById` now directly accesses DB without serialization wrapper

## UI/UX Enhancements
- **Dynamic Island**: Adaptive vignette based on cover art brightness (light vs dark)
- **Vinyl Record**: Increased cover art to 60%, reduced center hole to 3%
- **Controls Auto-Hide**: Stay visible when paused, hide after 3.5s when playing
- **Navigation**: Added fallback to Main screen if `goBack()` fails

## Bug Fixes
- **ImagePicker**: Updated to array format `['images']` (deprecated API fix)
- **Edit Screen**: Fixed empty lyrics/title/artist loading issue
- **MiniPlayer**: Non-blocking brightness detection, won't block press events
- **Position Display**: Fixed "0:00" stuck issue with proper time sync

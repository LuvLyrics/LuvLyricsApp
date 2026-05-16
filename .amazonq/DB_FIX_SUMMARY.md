# SQLite Native Crash Fix - Implementation Summary

## Changes Made

### 1. Strict Singleton Pattern (`src/database/db.ts`)
- Added `isInitialized` flag to prevent multiple initialization attempts
- Enhanced logging with `[DB]` prefix for all database operations
- Clean slate approach: closes stale handles before opening new ones
- Single `initPromise` gate ensures only one initialization runs at a time
- Recovery path: deletes corrupted database and recreates from scratch

### 2. Comprehensive Logging (`src/database/queries.ts`)
- Added `[QUERIES]` prefix logging to all write operations
- `insertSong()` now logs: start, metadata insert, lyrics progress (every 10 lines), completion
- `updateSong()` now logs: start, metadata update, delete old lyrics, insert new lyrics progress, completion
- Enhanced error logging in `withDbRetry()` to capture exact failure point

### 3. Removed Background Refresh (`src/store/songsStore.ts`)
- `addSong()` no longer calls `fetchSongs()` after insert (prevents concurrent DB access)
- `updateSong()` no longer calls `fetchSongs()` after update
- Only updates in-memory `currentSong` if it matches the updated song ID
- Reduces DB contention during critical write operations

### 4. Better Error Reporting (`src/screens/AddEditLyricsScreen.tsx`)
- Success alert shows before navigation
- Error alert displays full error message for debugging
- User can see exact error from console logs

## How to Test

1. **Clean rebuild**: Stop app, clear cache, rebuild native app (not just hot reload)
2. **Watch console**: Look for `[DB]` and `[QUERIES]` logs during save
3. **Test save**: Try adding a new song with lyrics
4. **Check logs**: If NPE occurs, logs will show exactly which SQL statement failed

## Expected Log Output (Success)

```
[DB] initDatabase() called
[DB] Opening database...
[DB] Database opened, initializing tables...
[DB] Tables initialized successfully
[DB] Database ready
[DB] initDatabase() completed
[QUERIES] insertSong() called for: Song Title
[QUERIES] Inserting song metadata: song-id-123
[QUERIES] Song metadata inserted, inserting 25 lyrics...
[QUERIES] Inserted 1/25 lyrics
[QUERIES] Inserted 11/25 lyrics
[QUERIES] Inserted 21/25 lyrics
[QUERIES] insertSong() completed successfully
```

## If Still Failing

The logs will reveal:
1. **Which operation fails**: metadata insert vs lyrics insert
2. **When it fails**: first lyric vs middle of batch
3. **Native state**: if recovery is triggered

Next steps if NPE persists:
1. Check Expo SDK compatibility: `expo-sqlite@16.0.10` with `expo@54.0.33`
2. Test on different device/emulator
3. Try minimal insert (song only, no lyrics) to isolate issue
4. Consider native module rebuild or Expo SDK downgrade

## Rollback Instructions

If this breaks something else:
```bash
git checkout HEAD~1 src/database/db.ts
git checkout HEAD~1 src/database/queries.ts
git checkout HEAD~1 src/store/songsStore.ts
git checkout HEAD~1 src/screens/AddEditLyricsScreen.tsx
```

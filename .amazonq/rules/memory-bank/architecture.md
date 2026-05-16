# Project Architecture Overview

## Tech Stack
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript 5.9
- **Database**: SQLite (expo-sqlite)
- **State Management**: Zustand
- **UI**: React Native Skia, Reanimated
- **Audio**: expo-audio

## Directory Structure

### src/components/
- **AuroraHeader.tsx** - Skia-powered blurred backgrounds
- **CustomMenu.tsx** - iOS-style anchored menus
- **GradientBackground.tsx** - Animated morphing gradients
- **GradientPicker.tsx** - Color preset selector
- **LrcSearchModal.tsx** - Unified search UI with **Preview Mode**
- **LyricsLine.tsx** - Animated lyric lines with glow
- **PlayerControls.tsx** - Playback buttons
- **Scrubber.tsx** - Timeline progress bar
- **SongCard.tsx** - Grid items with cover art
- **VinylRecord.tsx** - Rotating vinyl UI
- **Toast.tsx** - Spring-animated notifications
- **MiniPlayer.tsx** - Compact background player
- **IslandScrubber.tsx** - Dynamic Island progress indicator
- **SynchronizedLyrics.tsx** - High-precision synced lyrics
- **MagicModeModal.tsx** - AI-powered magic lyrics search
- **ManualSyncModal.tsx** - Manual timestamp synchronization
- **LanguagePickerModal.tsx** - Transliteration language selector
- **AIGeneratorModal.tsx** - AI lyrics generation
- **BatchReviewModal.tsx** - Batch lyrics review
- **BulkSwapModal.tsx** - Bulk operations
- **CoverFlow.tsx** - 3D cover carousel
- **MosaicCover.tsx** - Grid mosaic display
- **DownloadGridCard.tsx** - Download item card
- **DownloadQueueModal.tsx** - Download queue management
- **FloatingDownloadIndicator.tsx** - Active download progress
- **ReelCard.tsx** - Social reels card
- **ReelsVaultModal.tsx** - Reels collection vault
- **PlaylistItem.tsx** - Playlist list item
- **AddToPlaylistModal.tsx** - Add song to playlist
- **CreatePlaylistModal.tsx** - Create new playlist
- **PlaylistSelectionModal.tsx** - Select playlist

### src/database/
- **db.ts** - SQLite initialization, singleton, recovery
- **queries.ts** - CRUD operations with retry logic
- **playlistQueries.ts** - Playlist-specific CRUD
- **db_migration.ts** - Database migrations
- **sampleData.ts** - Welcome songs for first launch

### src/screens/
- **LibraryScreen.tsx** - Home screen (Grid + List)
- **NowPlayingScreen.tsx** - Lyric reader (60fps Engine) with **Magic Button**
- **AddEditLyricsScreen.tsx** - Song metadata form
- **SearchScreen.tsx** - Real-time library search
- **SettingsScreen.tsx** - App preferences
- **AudioDownloaderScreen.tsx** - Multi-source audio downloader
- **CoverArtSearchScreen.tsx** - Cover art search
- **LikedSongsScreen.tsx** - Favorites collection
- **PlaylistDetailScreen.tsx** - Individual playlist view
- **PlaylistsScreen.tsx** - All playlists management
- **ReelsScreen.tsx** - Short-form content feed
- **YoutubeBrowserScreen.tsx** - YouTube audio browser

### src/services/ (The Search Engine)
- **MultiSourceLyricsService.ts** - Parallel fetching from all providers (5s race)
- **JioSaavnLyricsService.ts** - Official JioSaavn API wrapper
- **LyricaService.ts** - Lyrica API client
- **LrcLibService.ts** - LRCLIB API client
- **GeniusService.ts** - Scraper with metadata scrubbing
- **SmartLyricMatcher.ts** - Result scoring logic
- **Tamil2LyricsService.ts** - Tamil lyrics service
- **TransliterationService.ts** - Romanization for regional languages
- **LyricsRepository.ts** - Unified search orchestration
- **DownloadManager.ts** - Download queue and management
- **MusicSearchService.ts** - Music search
- **NativeSearchService.ts** - Native search
- **ImageSearchService.ts** - Cover art search
- **ReelsBufferManager.ts** - Reels buffer management
- **ReelsRecommendationEngine.ts** - Content recommendations

### src/store/ (Zustand)
- **songsStore.ts** - Master song list
- **playerStore.ts** - Playback state
- **settingsStore.ts** - UI preferences
- **playlistStore.ts** - Playlist management
- **downloadQueueStore.ts** - Download queue
- **lyricsScanQueueStore.ts** - Lyrics scan queue
- **reelsFeedStore.ts** - Reels feed state
- **reelsPreferencesStore.ts** - Reels preferences
- **dailyStatsStore.ts** - Daily listening statistics
- **artHistoryStore.ts** - Recent cover art history

### src/utils/
- **timestampParser.ts** - Lyric text → structured data
- **exportImport.ts** - JSON backup/restore
- **formatters.ts** - Time/text formatting
- **gradients.ts** - Gradient utilities
- **imageAnalyzer.ts** - Image brightness analysis

## Key Design Patterns

### 1. Database Singleton
```typescript
// db.ts - Prevents multiple connections
let dbPromise: Promise<SQLiteDatabase> | null = null;
export const getDatabase = async () => {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
};
```

### 2. Parallel Search Strategy
```typescript
// MultiSourceLyricsService.ts - Aggregates and Ranks
const multiResults = await MultiSourceLyricsService.fetchLyricsParallel(title, artist, duration);
results = multiResults.map(res => ({
  ...res,
  matchScore: SmartLyricMatcher.calculateScore(res, null, targetMetadata)
})).sort((a, b) => b.matchScore - a.matchScore);
```

### 3. Smart Scraping & Sanitization
```typescript
// GeniusService.ts - Cleaning web-injected metadata
const cleanedLines = plainText.split('\n').filter(line => {
  if (/^\d+\s+contributors?$/i.test(line)) return false;
  if (/^you might also like$/i.test(line)) return false;
  return true;
});
```

## Database Schema

```sql
CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  gradient_id TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  date_created TEXT NOT NULL,
  date_modified TEXT NOT NULL,
  play_count INTEGER DEFAULT 0,
  last_played TEXT,
  scroll_speed INTEGER DEFAULT 50,
  cover_image_uri TEXT,
  lyrics_align TEXT DEFAULT 'left',
  text_case TEXT DEFAULT 'normal',
  audio_uri TEXT,
  is_liked INTEGER DEFAULT 0,
  lyricSource TEXT,
  transliterated_lyrics TEXT,
  instrumental_stem_uri TEXT,
  vocal_stem_uri TEXT,
  separation_status TEXT DEFAULT 'none',
  separation_progress INTEGER DEFAULT 0
);

CREATE TABLE playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_uri TEXT,
  is_default INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  date_created TEXT NOT NULL,
  date_modified TEXT NOT NULL
);

CREATE TABLE playlist_songs (
  playlist_id TEXT,
  song_id TEXT,
  order_index INTEGER,
  PRIMARY KEY (playlist_id, song_id)
);
```

## Critical Implementation Notes

### 60fps Scroll Engine
- Uses `requestAnimationFrame` loop
- Calculates `deltaTime` for sub-millisecond precision
- Active line fixed at 30% from top
- Auto-hide controls after 3.5s when playing

### Lyric Preview Mode
- Full text/timestamp preview before database update
- Prevents accidental overwrites of existing lyrics
- Integrated in `LrcSearchModal.tsx`

### Dynamic Island & MiniPlayer
- Right-aligned compact island for a premium top-bar experience
- Synchronized vertical alignment with the "LuvLyrics" brand title
- Expanded view for quick access to playback controls

### Parallel Search Engine
- Fetches from LRCLIB, JioSaavn, and Lyrica simultaneously
- 5-second race condition - returns first successful result
- Fallback to all results if no synced lyrics found

### Hardware & Media Session Sync
- Full integration with `expo-audio` for system-level remote commands
- Bluetooth skip/play/pause support
- Real-time lock screen metadata and artwork synchronization

### Error Recovery
- Database: Automatic retry with connection reset
- Network: Timeout and AbortController for fetch calls
- Search: Waterfall fallback ensures results even if one provider fails

# Project Structure

## Directory Organization

### Root Level
```
LuvLyrics/
├── src/                    # Main application source code
├── android/                # Android native configuration
├── assets/                 # App icons and splash screens
├── docs/                   # Documentation files
├── .amazonq/rules/         # Amazon Q rules and memory bank
├── App.tsx                 # Root application component
├── index.ts                # Entry point
├── package.json            # Dependencies and scripts
├── app.json                # Expo configuration
├── tsconfig.json           # TypeScript configuration
└── babel.config.js         # Babel configuration
```

### Source Directory (`src/`)

#### **`src/components/`** - UI Building Blocks
- **`AuroraHeader.tsx`**: Skia-powered organic blurred background system
- **`CustomMenu.tsx`**: iOS-style anchored drop-up menu with dynamic positioning
- **`GradientBackground.tsx`**: Animated morphing gradients with GPU acceleration
- **`GradientPicker.tsx`**: High-performance preset selector
- **`LrcSearchModal.tsx`**: Unified search interface with **Preview Mode** and source filtering
- **`LyricsLine.tsx`**: Animated line component with distance-based blur and glow
- **`PlayerControls.tsx`**: Core playback interaction buttons with ±10s skip
- **`Scrubber.tsx`**: Timeline progress bar with optimistic seeking
- **`SongCard.tsx`**: Grid/list item with gradient fallbacks and custom cover art
- **`VinylRecord.tsx`**: Realistic rotating vinyl record UI for Now Playing
- **`Toast.tsx`**: Spring-animated notification component with auto-dismiss
- **`index.ts`**: Component exports

#### **`src/constants/`** - Design System
- **`colors.ts`**: True Black foundation for AMOLED contrast
- **`gradients.ts`**: 24+ curated vibrant visual presets
- **`typography.ts`**: Scaled font sizes for accessibility

#### **`src/database/`** - Persistence Layer
- **`db.ts`**: SQLite initialization and singleton management
- **`queries.ts`**: CRUD operations with retry logic

#### **`src/screens/`** - Main Application Screens
- **`AddEditLyricsScreen.tsx`**: Form for song metadata and lyrics
- **`LibraryScreen.tsx`**: Hybrid layout (grid + list)
- **`NowPlayingScreen.tsx`**: Main reader with 60fps scroll engine and **Dynamic Magic Button**
- **`SearchScreen.tsx`**: Real-time library search
- **`SettingsScreen.tsx`**: App configuration

#### **`src/services/`** - Business Logic Services
- **`LyricsRepository.ts`**: Waterfall search orchestrator (LRCLIB → Genius)
- **`LrcLibService.ts`**: LRCLIB API client for synced lyrics
- **`GeniusService.ts`**: Scraper with robust metadata scrubbing
- **`SmartLyricMatcher.ts`**: Search result scoring logic
- **`audioService.ts`**: Audio playback management
- **`mediaScanner.ts`**: Device media scanning
- **`whisperService.ts`**: (Legacy) On-device transcription

#### **`src/store/`** - State Management (Zustand)
- **`artHistoryStore.ts`**: Tracks "Recent Art" for quick reuse
- **`playerStore.ts`**: Playback state, Session Queue, auto-play controls
- **`settingsStore.ts`**: Persists UI preferences to disk
- **`songsStore.ts`**: Master song list and metadata state
- **`index.ts`**: Store exports

#### **`src/types/`** - TypeScript Definitions
- **`gradient.ts`**: Gradient type definitions
- **`navigation.ts`**: Navigation type definitions
- **`song.ts`**: Song and lyric type definitions
- **`index.ts`**: Type exports

#### **`src/utils/`** - Helper Functions
- **`audioConverter.ts`**: Audio format conversion utilities
- **`exportImport.ts`**: JSON serialization for library backups
- **`formatters.ts`**: Time and text formatting utilities
- **`gradients.ts`**: Gradient manipulation utilities
- **`timestampParser.ts`**: Converts raw text into structured `LyricLine` objects
- **`index.ts`**: Utility exports

## Core Components & Relationships

### Data Flow Architecture
```
User Input → Screen → Store (Zustand) → Database (SQLite)
                ↓
            Components ← Services (Audio, AI)
```

### Key Relationships

1. **Screens ↔ Stores**: Screens consume and update Zustand stores
2. **Stores ↔ Database**: Stores persist data to SQLite via queries
3. **Components ↔ Stores**: Components read reactive state from stores
4. **Services ↔ Stores**: Services update stores with playback/AI results
5. **Utils ↔ All Layers**: Utilities provide pure functions across the app

### Database Schema
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
  text_case TEXT DEFAULT 'normal'
);
```

## Architectural Patterns

### 1. Singleton Pattern
- **Database Connection**: Single `dbPromise` ensures one connection across app
- **Recovery Mechanism**: Automatic retry on NullPointerException

### 2. Store Pattern (Zustand)
- **Reactive State**: Components auto-update on store changes
- **Persistence**: Settings and player state persist to AsyncStorage
- **Separation of Concerns**: Each store handles specific domain

### 3. Service Layer Pattern
- **Audio Service**: Encapsulates Expo AV playback logic
- **Whisper Service**: Isolates AI processing complexity
- **DTW Service**: Handles timestamp alignment algorithms

### 4. Component Composition
- **Atomic Design**: Small, reusable components (LyricsLine, Toast)
- **Container/Presenter**: Screens orchestrate, components present
- **Props Drilling Avoidance**: Zustand stores eliminate prop chains

### 5. 60fps Scroll Engine
- **requestAnimationFrame Loop**: High-precision deltaTime calculations
- **Fixed Positioning**: Active line at 30% from top (viewPosition: 0.3)
- **No Layout Shifts**: Same font weight for active/inactive prevents reflow

## Lifecycle of a Lyric

1. **Input**: User pastes text into `AddEditLyricsScreen`
2. **Parsing**: `timestampParser.ts` extracts timestamps and cleans text
3. **Storage**: `queries.ts` saves structured data to SQLite atomically
4. **Display**: `NowPlayingScreen` loads structured data from store
5. **Animation**: 60fps Scroll Engine animates `LyricsLine` with sub-ms precision
6. **Interaction**: User taps line → `seek()` updates state → scroll realigns instantly

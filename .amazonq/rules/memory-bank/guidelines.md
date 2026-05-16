# Development Guidelines

## Code Quality Standards

### File Headers & Documentation
- **Consistent file headers**: Every source file starts with a JSDoc-style comment identifying the module
  ```typescript
  /**
   * LyricFlow - [Module Name]
   * [Brief description of purpose]
   */
  ```
- **Inline comments**: Use for complex logic, algorithms, and non-obvious decisions
- **Function documentation**: Document public APIs, especially utility functions with parameters and return types

### Code Formatting
- **Line endings**: CRLF (`\r\n`) for Windows compatibility
- **Indentation**: 2 spaces (no tabs)
- **Semicolons**: Always use semicolons at statement ends
- **Quotes**: Single quotes for strings, except in JSX where double quotes are acceptable
- **Trailing commas**: Use in multi-line arrays and objects
- **Max line length**: Aim for ~100-120 characters, break long lines logically

### Naming Conventions
- **Files**: PascalCase for components/screens (`NowPlayingScreen.tsx`), camelCase for utilities (`timestampParser.ts`)
- **Components**: PascalCase (`LyricsLine`, `CustomMenu`)
- **Functions**: camelCase (`parseTimestampedLyrics`, `handleLineTap`)
- **Constants**: SCREAMING_SNAKE_CASE for true constants (`TIMESTAMP_REGEX`, `DATABASE_NAME`)
- **Variables**: camelCase (`currentSong`, `isPlaying`)
- **Interfaces/Types**: PascalCase (`Song`, `LyricLine`, `SongsState`)
- **Private variables**: Prefix with underscore is NOT used; use module scope instead

### Structural Conventions
- **Export patterns**: Named exports from index files for clean imports
  ```typescript
  export { GradientBackground } from './GradientBackground';
  export { LyricsLine } from './LyricsLine';
  ```
- **Index files**: Every directory has an `index.ts` that re-exports public APIs
- **Single responsibility**: Each file has one primary export (component, utility, store)
- **Separation of concerns**: UI components separate from business logic (services, stores)

## Semantic Patterns

### React Component Patterns

#### 1. Functional Components with TypeScript
- **Always use functional components** with React.FC or explicit typing
  ```typescript
  const NowPlayingScreen: React.FC<Props> = ({ navigation, route }) => {
    // Component logic
  };
  ```
- **Props interfaces**: Define props interface above component
  ```typescript
  interface LyricsLineProps {
    text: string;
    isActive: boolean;
    onPress?: () => void;
  }
  ```

#### 2. React Hooks Usage
- **Hook order**: Follow React's rules of hooks (same order every render)
- **Custom hooks**: Extract complex stateful logic into custom hooks
- **useEffect dependencies**: Always include all dependencies in dependency array
- **useCallback/useMemo**: Use for expensive computations and callback stability
  ```typescript
  const renderLyric = useCallback(({ item, index }) => (
    <LyricItem item={item} index={index} />
  ), [displayLineIndex, currentSong?.lyricsAlign]);
  ```

#### 3. React.memo for Performance
- **Memoize list items**: Use React.memo for FlatList items to prevent unnecessary re-renders
  ```typescript
  const LyricItem = React.memo<Props>(({ item, index }) => {
    // Component logic
  });
  LyricItem.displayName = 'LyricItem';
  ```

#### 4. Refs for Imperative Operations
- **useRef for mutable values**: Use refs for values that don't trigger re-renders
  ```typescript
  const flatListRef = useRef<FlatList>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasTimestamps = useRef(false);
  ```

### State Management (Zustand)

#### 1. Store Structure
- **Zustand create pattern**: Define state and actions in single object
  ```typescript
  export const useSongsStore = create<SongsState>((set, get) => ({
    // State
    songs: [],
    isLoading: false,
    
    // Actions
    fetchSongs: async () => {
      set({ isLoading: true });
      const songs = await queries.getAllSongs();
      set({ songs, isLoading: false });
    },
  }));
  ```
- **Async actions**: Handle loading states and errors explicitly
- **State updates**: Use functional updates when depending on previous state
- **Store composition**: Separate stores by domain (songs, player, settings)

#### 2. Store Consumption
- **Selective subscriptions**: Only subscribe to needed state slices
  ```typescript
  const { currentSong, getSong } = useSongsStore();
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  ```

### Database Patterns

#### 1. Singleton Pattern
- **Single database instance**: Use promise-based singleton to prevent race conditions
  ```typescript
  let db: SQLite.SQLiteDatabase | null = null;
  let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;
  
  export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
    if (isInitialized && db) return db;
    if (initPromise) return initPromise;
    // Initialize...
  };
  ```

#### 2. Error Recovery
- **Automatic retry**: Wrap database operations in retry logic
- **Graceful degradation**: Attempt recovery (delete/recreate) on corruption
- **Logging**: Prefix all logs with `[DB]` for easy filtering

#### 3. Migrations
- **Column additions**: Check schema with PRAGMA, add columns if missing
  ```typescript
  const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(songs)');
  if (!columns.some(c => c.name === 'lyrics_align')) {
    await database.execAsync('ALTER TABLE songs ADD COLUMN lyrics_align TEXT DEFAULT "left"');
  }
  ```

### Animation Patterns

#### 1. React Native Reanimated
- **Shared values**: Use `useSharedValue` for animated values
  ```typescript
  const controlsOpacity = useSharedValue(1);
  const controlsTranslateY = useSharedValue(0);
  ```
- **Animated styles**: Use `useAnimatedStyle` for style animations
  ```typescript
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    transform: [{ translateY: controlsTranslateY.value }],
  }));
  ```
- **Spring animations**: Use `withSpring` for natural motion
  ```typescript
  controlsOpacity.value = withSpring(1);
  ```

#### 2. 60fps Scroll Engine
- **requestAnimationFrame**: Use RAF for smooth animations
  ```typescript
  const animate = (frameTime: number) => {
    const dt = (frameTime - lastFrameTimeRef.current) / 1000;
    tick(dt);
    animationFrameRef.current = requestAnimationFrame(animate);
  };
  ```
- **Delta time**: Calculate frame delta for frame-rate independent animations
- **Cleanup**: Always cancel animation frames in useEffect cleanup

### Utility Functions

#### 1. Pure Functions
- **No side effects**: Utility functions should be pure (same input → same output)
  ```typescript
  export const parseTimeToSeconds = (minutes: string, seconds: string): number => {
    return parseInt(minutes, 10) * 60 + parseInt(seconds, 10);
  };
  ```
- **Explicit parameters**: All inputs as parameters, no hidden dependencies
- **Return values**: Always return results, don't modify parameters

#### 2. Regex Patterns
- **Named constants**: Define regex patterns as constants with descriptive names
  ```typescript
  const TIMESTAMP_REGEX = /[\[\(]?(\d{1,2})[:.](\d{2})[\]\)]?/g;
  ```
- **Flexible matching**: Support multiple formats (brackets, parentheses, plain)

#### 3. Error Handling
- **Try-catch blocks**: Wrap risky operations in try-catch
- **Error logging**: Always log errors with context
  ```typescript
  try {
    await updateSong(song);
  } catch (error) {
    console.error('[STORE] Update error:', error);
    set({ error: error instanceof Error ? error.message : 'Failed to update song' });
    throw error;
  }
  ```
- **User feedback**: Show alerts/toasts for user-facing errors

## Internal API Usage

### Expo APIs

#### 1. Expo SQLite
```typescript
import * as SQLite from 'expo-sqlite';

// Open database
const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

// Execute SQL
await db.execAsync(`CREATE TABLE IF NOT EXISTS songs (...)`);

// Query with parameters
const songs = await db.getAllAsync<Song>('SELECT * FROM songs WHERE id = ?', [songId]);

// Close database
await db.closeAsync();
```

#### 2. Expo Image Picker
```typescript
import * as ImagePicker from 'expo-image-picker';

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
});

if (!result.canceled && result.assets[0].uri) {
  const uri = result.assets[0].uri;
  // Use URI
}
```

#### 3. Expo Audio
```typescript
import { useAudioPlayer } from 'expo-audio';

const player = useAudioPlayer(audioUri);

// Control playback
player.play();
player.pause();
player.seekTo(timeInMs);

// Access state
const isPlaying = player.playing;
const currentTime = player.currentTime; // in milliseconds
```

### React Navigation

#### 1. Navigation Props
```typescript
import { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'NowPlaying'>;

const Screen: React.FC<Props> = ({ navigation, route }) => {
  const { songId } = route.params;
  
  // Navigate
  navigation.navigate('Library');
  navigation.replace('NowPlaying', { songId: newId });
  navigation.goBack();
};
```

#### 2. Navigation Guards
```typescript
if (navigation.canGoBack()) {
  navigation.goBack();
} else {
  navigation.navigate('Library' as never);
}
```

### React Native Components

#### 1. FlatList Optimization
```typescript
<FlatList
  ref={flatListRef}
  data={lyrics}
  keyExtractor={(item, index) => `${item.timestamp}-${index}`}
  renderItem={renderLyric}
  removeClippedSubviews={false}
  maxToRenderPerBatch={5}
  updateCellsBatchingPeriod={100}
  windowSize={11}
  initialNumToRender={10}
  onScrollToIndexFailed={(info) => {
    // Handle gracefully
  }}
  ListHeaderComponent={<View style={{ height: SCREEN_HEIGHT * 0.3 }} />}
  ListFooterComponent={<View style={{ height: SCREEN_HEIGHT * 0.6 }} />}
/>
```

#### 2. Pressable with Gestures
```typescript
<Pressable 
  onPress={handlePress}
  onLongPress={handleLongPress}
  delayLongPress={1500}
  style={styles.button}
>
  <Text>Press me</Text>
</Pressable>
```

## Frequently Used Idioms

### 1. Conditional Rendering
```typescript
{showLyrics && lyrics.length > 0 && (
  <View>
    {/* Content */}
  </View>
)}

{lyrics.length === 0 ? (
  <EmptyState />
) : (
  <LyricsList />
)}
```

### 2. Optional Chaining & Nullish Coalescing
```typescript
const title = currentSong?.title ?? 'Unknown Song';
const duration = song.duration > 0 ? song.duration : calculateDuration(song.lyrics);
```

### 3. Array Methods
```typescript
// Map with index
const mappedLyrics = result.lyrics.map((line, index) => ({
  ...line,
  lineOrder: index
}));

// Filter
const remainingSongs = songs.filter(s => s.id !== songId);

// Find
const queueSong = songs.find(s => s.id === id);

// Some/Every
const hasTimestamps = lyrics.some(l => l.timestamp > 0);
const allZero = lyrics.every(line => line.timestamp === 0);
```

### 4. Async/Await Error Handling
```typescript
const loadSong = async () => {
  try {
    const song = await getSong(songId);
    if (song) {
      setLyrics(song.lyrics, song.duration);
    }
  } catch (error) {
    console.error('Load failed:', error);
    Alert.alert('Error', 'Failed to load song');
  }
};
```

### 5. Cleanup in useEffect
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // Do something
  }, 3500);
  
  return () => {
    clearTimeout(timer);
  };
}, [dependency]);
```

### 6. Spread Operator for Updates
```typescript
const updatedSong = {
  ...currentSong,
  lyrics: newLyrics,
  dateModified: new Date().toISOString(),
};
```

### 7. Destructuring with Defaults
```typescript
const { 
  title = 'Unknown', 
  artist = 'Unknown Artist',
  lyricsAlign = 'left' 
} = currentSong || {};
```

## Popular Annotations

### TypeScript Type Annotations
```typescript
// Function parameters and return types
const formatTime = (seconds: number): string => {
  // Implementation
};

// Optional parameters
const updateSong = (song: Song, notify?: boolean) => {
  // Implementation
};

// Union types
type TextCase = 'normal' | 'uppercase' | 'titlecase' | 'sentencecase';

// Generics
const getAllAsync<T>(query: string): Promise<T[]> => {
  // Implementation
};

// Type assertions
const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(songs)');

// Const assertions for style objects
const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as const,
});
```

### React Component Annotations
```typescript
// Component type
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // Implementation
};

// Memo with display name
const MemoComponent = React.memo<Props>(Component);
MemoComponent.displayName = 'MemoComponent';

// Ref types
const ref = useRef<FlatList>(null);
const valueRef = useRef<number | null>(null);
```

### StyleSheet Patterns
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  text: {
    fontSize: 16,
    fontWeight: '600' as const, // Type assertion for font weight
    color: '#fff',
  },
});
```

## Best Practices Summary

1. **Always use TypeScript**: Explicit types for all functions, components, and state
2. **Memoize expensive operations**: Use React.memo, useCallback, useMemo appropriately
3. **Handle errors gracefully**: Try-catch blocks, user feedback, logging
4. **Clean up side effects**: Cancel timers, animation frames, subscriptions in useEffect cleanup
5. **Optimize lists**: Use FlatList with proper optimization props for large datasets
6. **Singleton for shared resources**: Database connections, service instances
7. **Separate concerns**: UI components, business logic (services), state (stores), utilities
8. **Document complex logic**: Comments for algorithms, non-obvious decisions
9. **Consistent naming**: Follow established conventions throughout codebase
10. **Test edge cases**: Handle empty states, missing data, network failures
11. **Teacher Forcing for AI**: Always use guided, instructional prompts to bias AI models towards provided "Source of Truth" text and prevent hallucinations.

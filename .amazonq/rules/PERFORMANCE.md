# 🚀 Critical Performance Architecture

> **WARNING**: Modifying the playback initialization logic without reading this document first will likely cause regressions in app startup time (from <100ms back to 3-10s).

## 1. Instant Playback Strategy (Optimistic UI)

The "Instant Load" feature relies on **Optimistic Updates** in `playerStore.ts`. We DO NOT wait for the full database query to complete before starting playback.

### ❌ The Old, Slow Way (Do Not Regression)
```typescript
loadSong: async (id) => {
  // Wait for 300ms+ DB query
  const fullSong = await db.getSong(id); 
  // THEN update state -> Audio starts
  set({ currentSong: fullSong }); 
}
```

### ✅ The Fast Way (Keep This Logic)
```typescript
loadSong: async (id) => {
  // 1. INSTANT: Grab metadata from songsStore memory cache
  const cached = useSongsStore.getState().songs.find(s => s.id === id);
  if (cached) {
     set({ currentSong: cached, loadedAudioId: null }); // Audio starts immediately! 🎵
  }

  // 2. BACKGROUND: Fetch heavy lyrics from DB
  const fullSong = await db.getSong(id);
  if (fullSong && get().currentSongId === id) {
     set({ currentSong: fullSong }); // Update lyrics silently
  }
}
```

---

## 2. List Virtualization & Memoization

The `LibraryScreen` contains a `FlatList` of 100+ items. Re-rendering this entire list on every press causes the UI thread to freeze, dropping the "ripple" animation frames.

### ❌ What Causes Lag (Broken Bounce)
- Passing an inline function `() => handlePress(song)` to `onPress`.
- Defining `renderItem` inline: `renderItem={({item}) => <Item ... />}`.
- Using a callback that depends on volatile state (like `playerCurrentSong`), forcing all items to re-render when the song changes.

### ✅ Examples of safe, performant code
- **Memoized Item**: `SongListItem` must be wrapped in `React.memo`.
- **Stable Callback**: `handleSongPress` should not depend on `playerCurrentSong`. Use `usePlayerStore.getState().currentSongId` inside the function instead.
- **Memoized Render**: Define `renderItem` outside the JSX or with `useCallback`.

```typescript
// LibraryScreen.tsx
const handleSongPress = useCallback((song) => {
   // READ from state, don't DEPEND on state
   const currentId = usePlayerStore.getState().currentSongId;
   // ...
}, []); // No dependencies!

const renderItem = useCallback(({ item }) => (
  <SongListItem song={item} onPress={handleSongPress} ... />
), [handleSongPress]);
```

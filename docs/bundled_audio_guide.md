# How to Bundle Lyrics & Audio with the App (Future Feature)

This guide explains how to ship the app with pre-installed songs (audio + lyrics) so they work offline immediately after installation.

## 1. Add Assets
1.  Create a folder: `src/assets/audio/`.
2.  Place your `.mp3` or `.m4a` files there (e.g., `midnight-city.mp3`).

## 2. Map Assets
Create a mapping file `src/assets/audio/index.ts` to export these files as `require` calls.

```typescript
// src/assets/audio/index.ts
const BundledAudio: Record<string, any> = {
  'sample-midnight-city': require('./midnight-city.mp3'),
  'sample-bohemian-rhapsody': require('./bohemian-rhapsody.mp3'),
};

export default BundledAudio;
```

## 3. Resolve URIs at Runtime
React Native handles local assets differently in development (http://localhost...) vs production (file://...).
Use `Asset.fromModule(...)` to get a consistent URI string.

```typescript
import { Asset } from 'expo-asset';
import BundledAudio from '../src/assets/audio';

// Helper function
const resolveAssetUri = (moduleId: number): string => {
  const asset = Asset.fromModule(moduleId);
  return asset.uri; // Returns a usable string URI
};
```

## 4. Update Database Seeding (`src/database/sampleData.ts`)
Modify `loadSampleData` to resolve these URIs *before* inserting into the database.

```typescript
import BundledAudio from '../assets/audio';

export const loadSampleData = async (insertFn: any) => {
  // mapped songs
  const songsWithAudio = SAMPLE_SONGS.map(song => {
    // If we have a bundled asset for this ID
    if (BundledAudio[song.id]) {
      const asset = Asset.fromModule(BundledAudio[song.id]);
      return { ...song, audioUri: asset.uri };
    }
    return song;
  });

  // Insert into DB
  for (const song of songsWithAudio) {
    await insertFn(song);
  }
};
```

## 5. Pre-Loading Assets (Optional)
To ensure audio plays instantly without loading delay, you might want to cache these assets on startup in `App.tsx` using `Asset.loadAsync`.

```typescript
// App.tsx
import { Asset } from 'expo-asset';

// Inside prepare() function
await Asset.loadAsync([
  require('./src/assets/audio/midnight-city.mp3'),
  // ...
]);
```

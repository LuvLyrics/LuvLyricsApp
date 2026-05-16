# V10 Architecture & Performance Optimizations

## Overview
This document outlines the major architectural changes introduced in **V10** to solve performance bottlenecks on low-end Android devices.

## 1. FlashList Integration
- **Migration**: Replaced `FlatList` with `@shopify/flash-list` in `LibraryScreen.tsx`.
- **Reason**: `FlatList` suffered from blank spaces during fast scrolling due to bridge overhead. `FlashList` runs on the UI thread with recycling.
- **Key Props**:
  - `estimatedItemSize={74}`: Replaces `getItemLayout`.
  - Removed `updateCellsBatchingPeriod`, `windowSize`, `maxToRenderPerBatch`.

## 2. State Isolation (Zustand Slicing)
- **Problem**: Components were subscribing to the entire store state, causing re-renders on unrelated updates.
- **Fix**: Implemented strict selector pattern.
  - **Before**: `const { fontSize } = useSettingsStore()`
  - **After**: `const fontSize = useSettingsStore(s => s.fontSize)`
- **Affected Files**:
  - `LyricsLine.tsx`
  - `MiniPlayer.tsx`
  - `NowPlayingScreen.tsx`
  - `AddEditLyricsScreen.tsx`
  - `BackgroundDownloader.tsx`
  - `Toast.tsx`

## 3. O(1) Queue Logic
- **Problem**: `lyricsScanQueueStore` used an array (`ScanJob[]`). Checking status was O(n).
- **Fix**: Converted to `Record<string, ScanJob>`.
  - **Lookup**: `queue[songId]` (O(1))
  - **Updates**: Direct key access.
- **Impact**: Eliminates performance degradation as queue size grows.

## 4. Race Condition Fixes
- **BackgroundDownloader**: Lyrics scan is now enqueued **before** `fetchSongs()` to prevent UI refresh from missing the pending status.

## 5. Native Dependencies
- Added `@shopify/flash-list`.
- Requires `npx expo prebuild --clean` before running.

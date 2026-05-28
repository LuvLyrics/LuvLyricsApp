# LuvLyrics — Full Architecture Plan
**Thread Performance + Monorepo Microservice Split**
Version: 1.0 | Date: 2026-05-21 | Status: Planning

---

## Executive Summary

LuvLyrics currently ships as a single React Native/Expo package where every domain — playback, lyrics, search, downloads, library, and desktop bridge — shares one JS thread, one import graph, and one deployment unit. This causes two compounding problems:

1. **Runtime**: Everything competes for the same JS thread. Lyrics highlight ticks, download progress pulses, search result rerenders, and playback status callbacks all race each other. The result is dropped frames, sluggish scrubbing, and a UI that feels "assembled" rather than native.

2. **Developer**: A single package means changes to the downloader risk breaking the player. No clear domain contracts. No ability to test or deploy feature areas independently. As the desktop companion app grows, sharing code between mobile and desktop without a monorepo becomes copy-paste debt.

**The plan**: Split the repo into a Turborepo monorepo with isolated feature packages, and simultaneously fix the runtime ownership of every domain so the UI thread is protected. The two goals reinforce each other — splitting into packages forces the domain boundary discipline that also reduces thread contention.

**Total estimated work**: ~7,200 LOC across 5 phases over ~10–14 weeks.

---

## Part 1 — Likely Root Causes (Thread Performance)

These are the actual culprits in this repo shape, not generic RN advice.

### 1.1 Zustand subscriptions are too broad
`playerStore` contains `position`, `isPlaying`, `currentSong`, `queue`, and more in one slice. Any component that subscribes to `isPlaying` also re-renders on every `position` tick (every ~250ms). That's `MiniPlayer`, `NowPlayingScreen`, `SynchronizedLyrics`, and `TimelineScrubber` all re-rendering 4x/sec minimum — plus on any state change anywhere in the store.

### 1.2 `AudioDownloaderScreen` is an orchestration monolith
Search, selection mode, bulk mode, preview audio, queue prep, and playlist flows all live in one screen. Every tab switch, every search keystroke, every download progress event can cascade a rerender across the whole screen tree. This is the single biggest rerender hotspot outside of playback.

### 1.3 `SynchronizedLyrics` update frequency beats FlashList
Lyrics active-line index changes every few hundred milliseconds during playback. Even with FlashList, if the `activeLine` prop is passed into the list and causes item identity churn, every scroll and highlight update fights for the same JS-thread render slice as the scrubber and position ticker.

### 1.4 `MiniPlayer` owns too much
The expanded player UI, Dynamic Island style logic, Classic style logic, and seek handling all live together. This means style recalculation, gesture logic, and playback state reads all happen in one component subtree on every tick.

### 1.5 `useSongStaging` mixes async orchestration with staging state
Staging state changes (cover fetch done, lyrics fetch done, batch review ready) and the async work to produce them live in the same hook. Every intermediate async resolution potentially triggers rerenders in components that only care about final state.

### 1.6 `PlayerContext` runs on JS thread
Status syncing from `useAudioPlayer` into Zustand is a hot path — every position tick, every buffer event, every state transition. This is unavoidable given Expo's current API, but the damage can be limited by splitting the store slice so position ticks don't trigger non-playback rerenders.

### 1.7 Dynamic `require()` in `playerStore`
`nextInPlaylist()` dynamically `require`s `songsStore` as a circular dep workaround. Dynamic requires are slow and non-tree-shakeable. This is a design smell that signals the domain boundaries are wrong, not just a performance issue.

---

## Part 2 — Target Architecture

### 2.1 Monorepo Structure (Turborepo)

```
luvlyrics/
├── apps/
│   ├── mobile/               # React Native + Expo app (current repo becomes this)
│   └── desktop/              # Electron companion (from Desktop PRD)
├── packages/
│   ├── player-core/          # Playback engine, queue, position tracking
│   ├── lyrics-domain/        # Lyrics fetch, parse, sync, repository
│   ├── search-domain/        # Search providers, orchestration, result types
│   ├── download-domain/      # Download manager, queue, progress
│   ├── library-domain/       # SQLite, songs, playlists, indexing
│   ├── desktop-bridge/       # WebSocket bridge protocol, shared types
│   ├── ui-primitives/        # Design tokens, shared components, gradients
│   └── shared-types/         # Cross-package TypeScript types and contracts
├── turbo.json
├── package.json              # workspace root
└── tsconfig.base.json
```

**Why Turborepo over NX**: Lower config overhead for an Expo + Electron mixed workspace. Turborepo's remote caching also speeds up CI significantly once the package graph is established.

**Why not a full microservices backend**: LuvLyrics is a local-first app. "Microservices" here means **isolated package boundaries within the monorepo**, not network-separated services. Each package is an independently testable, independently versioned unit of domain logic. The app itself remains a single deployable binary — we are not adding network hops.

### 2.2 Package Responsibilities

#### `packages/player-core`
**Owns**: AudioPlayer instance wrapper, playback state machine, queue navigation, position emission, seek logic, auto-next logic, `playerStatusGuard`
**Does not own**: Song metadata fetching, lyrics sync, UI state
**State**: Position, isPlaying, currentSongId, queue, buffering flags
**Communication**: Exposes a typed event emitter and a Zustand slice factory. UI subscribes to slice selectors. Desktop bridge subscribes to the same event emitter via WebSocket relay.
**Thread boundary**: Position ticks stay on JS thread but are emitted through a throttled selector (not raw interval). Gesture/seek logic moves to Reanimated worklet where possible.

#### `packages/lyrics-domain`
**Owns**: `MultiSourceLyricsService`, `LyricaService`, `LyricsRepository`, LRC parsing, sync timing engine, active-line computation
**Does not own**: Playback position (receives it), UI rendering
**State**: Loaded lyrics lines, active line index, sync status
**Communication**: Receives position as a prop/signal from `player-core`. Exposes a `useLyricsSync` hook that returns only `activeIndex` + `lines` — no position tick leakage into UI.
**Thread boundary**: Active line computation moves to a `useDerivedValue` Reanimated worklet using shared position value. Zero JS-thread rerenders for lyrics highlight during normal playback.

#### `packages/search-domain`
**Owns**: `MultiSourceSearchService`, provider adapters, result types, debounce/cancel logic, error handling
**Does not own**: Download triggering, UI tab state, selection state
**State**: Search results per query, loading/error flags, provider status
**Communication**: Exposes async search functions + a Zustand slice. `AudioDownloaderScreen` reads from this slice; it does not own search logic.
**Thread boundary**: All network + parse work is async and deferred. Results are committed to the store in batches, not per-result.

#### `packages/download-domain`
**Owns**: `DownloadManager`, `downloadQueueStore`, `lyricsScanQueueStore`, concurrency control, progress tracking
**Does not own**: Search, library indexing post-download, UI
**State**: Queue entries, per-download progress, error state
**Communication**: Fires completion events consumed by `library-domain` for indexing. Progress updates are throttled to max 4/sec before being written to the store to prevent flooding.
**Thread boundary**: Progress pulses are the single biggest non-playback rerender driver. Throttled store writes are mandatory.

#### `packages/library-domain`
**Owns**: `songsStore`, `playlistStore`, SQLite queries, song indexing, cover management
**Does not own**: Playback, downloads, search
**State**: Song list, playlists, sort/filter state
**Communication**: `player-core` reads song metadata on demand via a lookup function exposed by this package. No circular require — clean dependency direction: `player-core` → (calls) → `library-domain`.

#### `packages/desktop-bridge`
**Owns**: WebSocket protocol definition, shared message types, serialization
**Does not own**: Implementation (mobile side lives in `apps/mobile`, Electron side in `apps/desktop`)
**Why isolated**: Both mobile and desktop need the same message type contracts. This package is the contract — it has no runtime code, only types and protocol constants.

#### `packages/ui-primitives`
**Owns**: Design tokens (colors, typography, gradients), base components (Button, Card, Row), theme provider
**Does not own**: Feature logic, store connections
**Why isolated**: Desktop Electron app needs the same design tokens. Currently those tokens are duplicated in the Desktop PRD. This package ends that duplication.

#### `packages/shared-types`
**Owns**: `Song`, `Playlist`, `DownloadEntry`, `LyricsLine`, `SearchResult`, `PlayerStatus` — all cross-package interfaces
**Does not own**: Any implementation
**Why isolated**: Prevents circular imports between domain packages. Everyone imports types from here.

---

## Part 3 — Performance Runtime Strategy

### 3.1 Thread Ownership Map

| Work | Current Thread | Target Thread | How |
|------|---------------|---------------|-----|
| Position tick (250ms) | JS | JS (throttled) | Throttle store write to 100ms; use `useDerivedValue` in Reanimated for progress bar |
| Scrubber drag | JS | UI (Reanimated) | Move `TimelineScrubber` gesture + progress bar animation to worklet |
| Lyrics active line | JS | UI (Reanimated) | `useDerivedValue` over shared position value |
| Download progress | JS | JS (throttled) | Max 4 store writes/sec per download |
| Search results | JS | JS (batched) | Commit results as a batch, not per-provider response |
| MiniPlayer expand/collapse | JS | UI (Reanimated) | Animated.Value + gesture worklet owns expand state |
| Cover image load | JS | Deferred | Load after song metadata; don't block render |
| SQLite reads | JS (sync-ish) | JS (async queue) | All queries go through an async queue; never block render cycle |

### 3.2 Zustand Slice Split

Split `playerStore` into focused slices to prevent cross-domain rerender bleed:

```ts
// Before: one big store, everything subscribes to everything
usePlayerStore(s => s.isPlaying)  // also re-renders on s.position change

// After: split slices
usePlaybackStateStore(s => s.isPlaying)    // only re-renders on playback state change
usePositionStore(s => s.position)          // only re-renders on position tick
useQueueStore(s => s.queue)               // only re-renders on queue change
```

Components that don't need position (e.g. play/pause button) never re-render on ticks.

### 3.3 `AudioDownloaderScreen` Decomposition

Split this screen into:
- `DownloaderShell` — tab container only, no state
- `SearchTab` — search input + results, reads from `search-domain` slice
- `QueueTab` — active downloads, reads from `download-domain` slice
- `BulkReviewModal` — extracted from screen, lazy loaded

Each tab is a separate component tree. Tab switches do not re-render sibling tabs.

### 3.4 `SynchronizedLyrics` Fix

```ts
// Move active line computation out of React render:
const activeLineIndex = useDerivedValue(() => {
  return computeActiveLine(position.value, lyricTimings);
});

// LyricsLine only re-renders when its own isActive status changes:
const isActive = useDerivedValue(() => activeLineIndex.value === index);
```

This eliminates all JS-thread rerenders for lyrics highlight. The worklet handles it.

### 3.5 Memoization Targets (high ROI only)

- `LyricsLine` — `React.memo` with stable `line` identity
- `DownloadRow` — `React.memo`; progress is passed as a derived selector, not raw store
- `SearchResultRow` — `React.memo`; stable item identity from search result ID
- Do NOT memo `MiniPlayer` as a whole — it needs to respond to playback state; memo its inner panels instead

---

## Part 4 — Phase-by-Phase Refactor Plan

### Phase 0 — Monorepo Bootstrap (Week 1)
**Objective**: Convert the current single-package repo into a Turborepo workspace. No feature changes. Mobile app still works identically.

**Work**:
- Add `turbo.json`, root `package.json` with `workspaces`
- Move current app code into `apps/mobile/`
- Create `packages/shared-types/` with existing interfaces extracted
- Create `packages/ui-primitives/` with `src/constants/` (colors, typography, gradients)
- Wire `tsconfig.base.json` path aliases

**Files impacted**: `package.json`, `tsconfig.json`, `src/constants/*`, all import paths that reference constants

**Risk**: Import path breakage. Mitigate with TypeScript path aliases and a find-replace pass.
**Validation**: `npm run typecheck` passes. `expo run:android` boots.
**LOC estimate**: ~400 LOC (mostly moves + path updates, minimal new code)

---

### Phase 1 — Zustand Slice Split + Store Boundary Cleanup (Week 2–3)
**Objective**: Stop position ticks from causing non-playback rerenders. Eliminate the `dynamic require` circular dep.

**Work**:
- Split `playerStore` into `playbackStateStore` (isPlaying, currentSong, currentSongId), `positionStore` (position, duration), `queueStore` (queue, currentPlaylistId)
- Fix `nextInPlaylist()` circular dep: `library-domain` exposes a `getSongsForLibrary()` function imported directly, no dynamic require
- Update all store subscribers to use the correct focused slice
- Add selector guards: `usePlaybackState`, `usePosition`, `useQueue` custom hooks that enforce slice boundaries

**Files impacted**: `src/store/playerStore.ts`, `src/contexts/PlayerContext.tsx`, `src/components/MiniPlayer.tsx`, `src/screens/NowPlayingScreen.tsx`, `src/components/SynchronizedLyrics.tsx`, `src/components/TimelineScrubber.tsx`, any component subscribing to playerStore

**Why it matters**: This is the single highest-ROI change. Eliminates the 4x/sec full-UI rerender caused by position ticks.
**Expected impact**: 60–70% reduction in render count during active playback.
**Risk**: Missing a subscriber and breaking a component silently. Mitigate with TypeScript — make old combined store type an error.
**Validation**: React DevTools Profiler before/after. Count renders per second on NowPlayingScreen during playback.
**LOC estimate**: ~800 LOC

---

### Phase 2 — Lyrics Runtime Move to Reanimated (Week 3–4)
**Objective**: Zero JS-thread rerenders for lyrics highlight during playback.

**Work**:
- Create `packages/lyrics-domain/` package: move `MultiSourceLyricsService`, `LyricaService`, `LyricsRepository` into it
- Expose `useLyricsSync(positionSharedValue)` hook that returns a Reanimated `derivedValue` for `activeIndex`
- Refactor `SynchronizedLyrics` to consume `activeIndex` as a shared value, not a React state
- Refactor `LyricsLine` to use `useAnimatedStyle` conditional on `activeIndex.value === index`
- Keep FlashList — but scroll-to-active line uses `scrollToIndex` triggered from a Reanimated `useAnimatedReaction` instead of a `useEffect`

**Files impacted**: `src/components/SynchronizedLyrics.tsx`, `src/components/LyricsLine.tsx`, `src/services/MultiSourceLyricsService.ts`, `src/services/LyricaService.ts`, `src/services/LyricsRepository.ts`, `src/hooks/useSongStaging.ts` (partial)

**Why it matters**: Lyrics are the most visually active element during playback. Moving highlight to UI thread makes them feel instant even under JS-thread load.
**Expected impact**: Lyrics highlight latency drops from ~50ms to sub-frame.
**Risk**: `scrollToIndex` from a worklet requires a ref bridge. Needs careful implementation.
**Validation**: Record screen at 60fps during playback. Check for highlight lag.
**LOC estimate**: ~900 LOC

---

### Phase 3 — `AudioDownloaderScreen` Decomposition (Week 4–6)
**Objective**: Break the orchestration monolith. Search, downloads, and bulk review become isolated component trees.

**Work**:
- Create `packages/search-domain/`: move `MultiSourceSearchService`, provider adapters, result types. Expose `useSearchStore` slice.
- Create `packages/download-domain/`: move `DownloadManager`, `downloadQueueStore`, `lyricsScanQueueStore`. Add throttled progress writes (max 4/sec).
- Decompose `AudioDownloaderScreen` into: `DownloaderShell` (tab container) + `SearchTab` + `QueueTab` + `BulkReviewModal` (lazy)
- Move `useSongStaging` async orchestration into a background queue class in `download-domain`; component only observes final staging state

**Files impacted**: `src/screens/AudioDownloaderScreen.tsx`, `src/services/MultiSourceSearchService.ts`, `src/services/DownloadManager.ts`, `src/components/BackgroundDownloader.tsx`, `src/components/BatchReviewModal.tsx`, `src/store/downloaderTabStore.ts`, `src/store/downloadQueueStore.ts`, `src/store/lyricsScanQueueStore.ts`, `src/hooks/useSongStaging.ts`

**Why it matters**: `AudioDownloaderScreen` is the second biggest render hotspot. Splitting it means tab switches are zero-cost and download progress only rerenders the queue tab.
**Expected impact**: Tab switch from Search to Queue goes from full-tree rerender to isolated subtree rerender.
**Risk**: State that currently flows implicitly through the screen needs to become explicit package-level state. Missing a cross-tab dependency will cause bugs.
**Validation**: Add rerender count assertions to key components via test harness. Tab switch must not rerender SearchTab.
**LOC estimate**: ~1,800 LOC

---

### Phase 4 — Scrubber + MiniPlayer UI Thread (Week 6–8)
**Objective**: Seek and MiniPlayer expand/collapse never drop frames.

**Work**:
- Refactor `TimelineScrubber` to run gesture + position bar animation entirely in Reanimated worklet. JS thread is only invoked on gesture end (to commit the seek).
- Refactor `MiniPlayer` expand/collapse to use a Reanimated shared value for expansion progress. Only one gesture handler. Dynamic Island vs Classic style is a static prop, not runtime branching on every render.
- Extract inner panels of MiniPlayer into memoized subcomponents: `PlaybackControls`, `TrackInfo`, `ProgressBar`. These memo-gate on their specific slice selectors.
- Move `PlayerContext` status sync to a fine-grained update: only write to store when state actually changes (guard with `===` check before calling `set`).

**Files impacted**: `src/components/TimelineScrubber.tsx`, `src/components/MiniPlayer.tsx`, `src/contexts/PlayerContext.tsx`

**Why it matters**: Seek smoothness is the most perceptible UX quality signal in a music player.
**Expected impact**: Scrubber drag maintains 60fps even under heavy JS-thread load (downloads + search in background).
**Risk**: Gesture handler refactor is easy to get wrong. Must preserve the wasPlaying/seek/resume pattern.
**Validation**: Manual test: drag scrubber while download is actively running. Should be smooth. Check wasPlaying resume still works.
**LOC estimate**: ~700 LOC

---

### Phase 5 — Desktop App + Shared Package Integration (Week 8–12)
**Objective**: Bootstrap `apps/desktop` (Electron) using shared packages. Validate monorepo pays off.

**Work**:
- Create `apps/desktop/` Electron app skeleton consuming `packages/ui-primitives` for design tokens and `packages/desktop-bridge` for WebSocket protocol
- Re-enable `DesktopBridgeService` in `apps/mobile` with proper start/stop lifecycle (this was blocked pending lifecycle correctness — Phase 4's `PlayerContext` cleanup unblocks this)
- `player-core` event emitter in mobile relays state to desktop bridge
- Desktop receives `PlayerStatus` events typed from `packages/shared-types`

**Files impacted**: `src/services/DesktopBridgeService.ts`, new `apps/desktop/` tree, `packages/desktop-bridge/`, `packages/player-core/`

**Why it matters**: Validates the entire monorepo investment. The desktop app gets a proper foundation instead of an ad-hoc port.
**Expected impact**: Code sharing between mobile and desktop — design tokens, types, bridge protocol — with zero duplication.
**Risk**: Electron + Expo in the same monorepo requires careful workspace dependency isolation. Don't let Electron native deps bleed into the mobile build.
**Validation**: Desktop app connects to mobile, receives `isPlaying` + `position` + `currentSong`. Play/pause command from desktop controls mobile.
**LOC estimate**: ~1,600 LOC (mostly new desktop app code)

---

## Part 5 — Codebase Inspection Checklist

Run this before starting each phase to confirm the assumption holds.

### Store subscriptions
- [ ] Every `usePlayerStore(s => s.X)` call — does it also re-render on `position` change?
- [ ] Any component that calls `usePlayerStore()` with no selector (full store subscription)?
- [ ] Any component in the downloader tab tree subscribed to `downloadQueueStore` that re-renders on every progress update?

### Render hotspots
- [ ] `MiniPlayer` — how many renders per second during active playback?
- [ ] `SynchronizedLyrics` — does `activeIndex` change trigger a full list rerender or per-item?
- [ ] `NowPlayingScreen` — does position tick cause a rerender of the whole screen?
- [ ] `AudioDownloaderScreen` — does download progress cause SearchTab to rerender?

### Async/orchestration
- [ ] `useSongStaging` — how many state transitions happen per song staging? Are intermediate states visible to the UI?
- [ ] `nextInPlaylist()` — does the `dynamic require` actually cause a module reload or is it cached?
- [ ] Download progress event frequency — is it raw or throttled before hitting the store?
- [ ] Search — are results committed per-provider or batched?

### Circular dependencies
- [ ] `playerStore` → `songsStore` dynamic require — only place?
- [ ] Any other `require()` calls inside function bodies?

### Animation ownership
- [ ] Is `TimelineScrubber` position bar driven by `Animated.Value` or raw state?
- [ ] Is `MiniPlayer` expand animation running on UI thread or JS thread?
- [ ] Are any `useEffect` hooks writing to `Animated.Value` (bad) vs using `withTiming`/`withSpring` (good)?

---

## Part 6 — Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Playback regression from store split | Medium | High | Keep old store as a re-export shim during migration; remove shim only after all consumers updated |
| Auto-next regression | Medium | High | Auto-next has existing fallback logic — add an integration test that asserts auto-next fires within 500ms of song end |
| Seek/wasPlaying regression | High (easy to miss) | High | Add a test: seek while playing → assert `player.play()` called if wasPlaying was true |
| Lyrics desync from Reanimated migration | Medium | Medium | Keep the old JS-thread path as a feature flag during migration; A/B test |
| Monorepo path breakage | High (initial) | Low | TypeScript strict paths catch it at compile time before runtime |
| Desktop bridge lifecycle leak | Medium | Medium | Phase 5 is explicitly blocked on Phase 4 `PlayerContext` cleanup |
| Over-abstraction without gain | Medium | Medium | Each phase has a measurable validation criterion — skip a sub-task if the measurement doesn't justify the LOC |

---

## Part 7 — Success Metrics

These are measurable, not vibes.

| Metric | How to Measure | Target |
|--------|---------------|--------|
| Render count during playback | React DevTools Profiler — renders/sec on NowPlayingScreen | < 2 renders/sec (down from ~16) |
| Scrubber drag FPS | Screen recording at 60fps + frame analysis | 60fps sustained during drag |
| Lyrics highlight latency | Frame timing from recording | < 16ms (1 frame) |
| Tab switch rerender cost | Profiler — components that rerender on tab switch | 0 rerenders in non-active tab |
| Download progress rerender rate | Profiler — renders/sec in QueueTab during active download | ≤ 4/sec (throttled) |
| JS thread blocked time during seek | Flipper JS Thread timeline | < 50ms blocking during seek |
| Monorepo build cache hit rate | Turborepo output | > 70% on CI after first full build |
| TypeScript compile time | `tsc --noEmit` timing before/after split | No regression (target < 20s) |

---

## Part 8 — 6000+ LOC Allocation Table

| Phase | Scope | Est. LOC | % of Total |
|-------|-------|---------|-----------|
| Phase 0 | Monorepo bootstrap + shared-types + ui-primitives | 400 | 5.5% |
| Phase 1 | Zustand slice split + circular dep fix | 800 | 11% |
| Phase 2 | Lyrics domain package + Reanimated sync | 900 | 12.5% |
| Phase 3 | Search + download packages + downloader screen decomp | 1,800 | 25% |
| Phase 4 | Scrubber + MiniPlayer UI thread migration | 700 | 10% |
| Phase 5 | Desktop app + bridge integration | 1,600 | 22% |
| Infra | turbo.json, tsconfigs, CI pipeline updates | 300 | 4% |
| Tests | Integration tests for playback regressions | 700 | 10% |
| **Total** | | **7,200** | |

---

## Part 9 — Highest ROI 40% Version

If you only complete Phases 0, 1, and 2, you get:

- Monorepo foundation (enables desktop app work in parallel)
- Store split (eliminates the biggest rerender source)
- Lyrics on UI thread (most perceptible UX improvement)

That's ~2,100 LOC, ~3 weeks of work, and covers the most user-visible smoothness issues. The app will feel significantly more native after just these three phases.

**Skip Phase 5 if**: Desktop app timeline is not imminent. The monorepo still pays off without it because package boundaries enforce discipline for mobile alone.

**Don't skip Phase 3**: `AudioDownloaderScreen` decomposition is essential for maintainability. Without it, the monorepo split is surface-level — the biggest complexity sinkhole is still one file.

---

## Part 10 — Prioritized Top 10 Refactor Targets

1. **`src/store/playerStore.ts`** — Split into 3 slices. Highest rerender ROI.
2. **`src/components/SynchronizedLyrics.tsx`** — Move active line to Reanimated. Most perceptible quality gain.
3. **`src/screens/AudioDownloaderScreen.tsx`** — Decompose into shell + tabs. Biggest maintainability gain.
4. **`src/components/TimelineScrubber.tsx`** — UI thread gesture. Most perceptible interaction quality.
5. **`src/contexts/PlayerContext.tsx`** — Guard store writes with equality check. Prevents unnecessary downstream ticks.
6. **`src/hooks/useSongStaging.ts`** — Separate async orchestration from staging state observation.
7. **`src/services/DownloadManager.ts`** — Throttle progress events before store write.
8. **`src/components/MiniPlayer.tsx`** — Extract + memo inner panels. Remove Dynamic Island / Classic branching from hot path.
9. **`src/store/downloadQueueStore.ts` + `lyricsScanQueueStore.ts`** — Move into `download-domain` package with throttled update contract.
10. **`src/services/MultiSourceLyricsService.ts` + `LyricsRepository.ts`** — Move into `lyrics-domain` package. Clean domain boundary.

---

## Part 11 — Final Recommendation

Start with **Phase 0 → Phase 1 → Phase 2** in sequence without skipping.

Phase 0 takes a day and pays dividends immediately — you can develop `player-core` in isolation while Phase 3 work on `AudioDownloaderScreen` happens in parallel.

Phase 1 (store split) is the single most impactful change and has zero user-visible risk if done with a shim-based migration. Do it first. Measure render count before and after. If the numbers match the prediction (60–70% reduction), the rest of the plan is validated.

Phase 2 (lyrics Reanimated) is the one users will notice most immediately. It makes the app feel alive. Do it right after Phase 1 while the momentum is there.

The monorepo is not just a developer quality-of-life improvement — it is what makes the Desktop app viable without code duplication, and it enforces the domain discipline that the thread performance gains depend on. The two goals are the same goal from different angles.

---

## Appendix — Package Dependency Graph

```
shared-types (no deps)
    ↑
ui-primitives (→ shared-types)
    ↑
library-domain (→ shared-types)
player-core (→ shared-types, → library-domain for song lookup)
lyrics-domain (→ shared-types, receives position from player-core)
search-domain (→ shared-types)
download-domain (→ shared-types, → library-domain for post-download indexing)
desktop-bridge (→ shared-types)
    ↑
apps/mobile (→ all packages)
apps/desktop (→ ui-primitives, desktop-bridge, shared-types)
```

No circular dependencies. `player-core` calls `library-domain` for song data — this is a clean one-way dependency that replaces the current `dynamic require` hack.

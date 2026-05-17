# Smoke Tests

This project includes small smoke checks for contributor confidence before a
full device or emulator run. They are useful when you touch parsing, alignment,
or CI-adjacent code and want a quick signal that core assumptions still hold.

## Real Alignment Smoke Test

Run the real-alignment smoke test from the repository root:

```bash
npm run smoke:alignment
```

You can also run the script directly:

```bash
node scripts/test_real_alignment.js
```

The script uses local mock lyric and Whisper-style word data, so it does not
need network access, Expo, Android Studio, Xcode, Firebase, or API keys.

## Expected Passing Output

A successful run exits with code `0` and prints these sections:

```text
Loading assets...
Prepared 40 lyric lines.
Prepared 181 whisper words.

--- ALIGNING (WINDOWED) ---
...
--- POST-PROCESSING: FIXING PILE-UPS (VAD ENFORCED STRETCH) ---
...
--- VAD SEGMENTS DETECTED ---
...
[00:00.82] Two Augusts ago (Conf: 97%)
```

Some fallback and VAD messages are expected. They show that the smoke fixture is
exercising difficult alignment cases such as instrumental gaps, low-confidence
words, and timestamp pile-ups.

Expected messages include:

- `FALLBACK JUMP`
- `VAD SEGMENTS DETECTED`
- `Voice Zone`
- Final timestamped lyric lines with confidence percentages

## Common Failures

### `npm run smoke:alignment` is missing

Make sure your branch includes the latest `package.json`, then reinstall if your
local npm metadata looks stale:

```bash
npm install
```

### `node` is not found

Install Node.js 20 or newer, then confirm the active version:

```bash
node --version
```

### The script exits before printing final lyric lines

Check recent edits to:

- `scripts/test_real_alignment.js`
- timestamp parsing helpers
- alignment or Whisper fixture data

The smoke test should always reach the final timestamped lyric output. If it
throws an exception or exits early, treat that as a failing smoke run.

## When to Run It

Run this smoke test when you change:

- lyric timestamp parsing
- Whisper alignment logic or fixtures
- scripts used for alignment debugging
- docs that explain local contributor checks

For broader changes, also run the standard checks from `README.md`:

```bash
npm run lint
npm run typecheck
npm run test:ci
```

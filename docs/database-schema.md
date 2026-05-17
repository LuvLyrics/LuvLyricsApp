# Database Schema and Migration Flow

LuvLyrics stores local library data in SQLite through `expo-sqlite`. The database
is initialized from `src/database/db.ts` and opened through the shared
`getDatabase()` singleton.

## Database File

- Database name: `lyricflow.db`
- SQLite pragmas enabled during initialization:
  - `journal_mode = WAL`
  - `synchronous = NORMAL`
  - `foreign_keys = ON`

## Tables

### `songs`

Stores the main library record for each track.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT` | Primary key. |
| `title` | `TEXT` | Required song title. |
| `artist` | `TEXT` | Optional artist name. |
| `album` | `TEXT` | Optional album name. |
| `gradient_id` | `TEXT` | Required UI gradient identifier. |
| `duration` | `INTEGER` | Duration value from the source data. Defaults to `0`. |
| `date_created` | `TEXT` | Required creation timestamp. |
| `date_modified` | `TEXT` | Required last-modified timestamp. |
| `play_count` | `INTEGER` | Number of plays. Defaults to `0`. |
| `last_played` | `TEXT` | Optional last-played timestamp. |
| `scroll_speed` | `INTEGER` | Lyrics scroll speed. Defaults to `50`. |
| `cover_image_uri` | `TEXT` | Optional local or remote cover image URI. |
| `lyrics_align` | `TEXT` | Lyrics alignment. Defaults to `left`. |
| `text_case` | `TEXT` | Added by migration. Defaults to `normal` for older databases. |
| `audio_uri` | `TEXT` | Optional local or remote audio URI. |
| `is_liked` | `INTEGER` | Added by migration. Uses `0` or `1`. |
| `vocal_stem_uri` | `TEXT` | Added by migration for AI karaoke stem storage. |
| `instrumental_stem_uri` | `TEXT` | Added by migration for AI karaoke stem storage. |
| `separation_status` | `TEXT` | Added by migration. Defaults to `none`. |
| `separation_progress` | `INTEGER` | Added by migration. Defaults to `0`. |
| `is_hidden` | `INTEGER` | Hidden-library flag. Uses `0` or `1`. Defaults to `0`. |

### `lyrics`

Stores timestamped lyric lines for a song.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `INTEGER` | Primary key with autoincrement. |
| `song_id` | `TEXT` | Required foreign key to `songs.id`. Deletes cascade when a song is removed. |
| `timestamp` | `INTEGER` | Lyric timestamp used for synchronized playback. |
| `text` | `TEXT` | Lyric line text. |
| `line_order` | `INTEGER` | Display order for lyric lines. |

### `playlists`

Stores playlist metadata.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `TEXT` | Primary key. |
| `name` | `TEXT` | Required playlist name. |
| `description` | `TEXT` | Optional playlist description. |
| `cover_image_uri` | `TEXT` | Optional local or remote cover image URI. |
| `is_default` | `INTEGER` | Marks the default "Liked Songs" playlist. Uses `0` or `1`. |
| `sort_order` | `INTEGER` | Playlist ordering value. Defaults to `0`. |
| `date_created` | `TEXT` | Required creation timestamp. |
| `date_modified` | `TEXT` | Required last-modified timestamp. |

### `playlist_songs`

Stores the many-to-many relationship between playlists and songs.

| Column | Type | Notes |
| --- | --- | --- |
| `playlist_id` | `TEXT` | Required foreign key to `playlists.id`. Deletes cascade when a playlist is removed. |
| `song_id` | `TEXT` | Required foreign key to `songs.id`. Deletes cascade when a song is removed. |
| `added_at` | `TEXT` | Required timestamp for when the song was added. |
| `sort_order` | `INTEGER` | Song ordering inside the playlist. Defaults to `0`. |

The primary key is the pair of `playlist_id` and `song_id`, so the same song can
only appear once in a playlist.

## Indexes

The initializer creates these indexes:

| Index | Columns | Purpose |
| --- | --- | --- |
| `idx_songs_title` | `songs(title)` | Speeds up title lookups. |
| `idx_songs_artist` | `songs(artist)` | Speeds up artist lookups. |
| `idx_lyrics_song_id` | `lyrics(song_id)` | Speeds up lyric loading for a song. |
| `idx_lyrics_timestamp` | `lyrics(timestamp)` | Supports timestamp-based lyric operations. |
| `idx_playlist_songs_playlist` | `playlist_songs(playlist_id, sort_order)` | Speeds up ordered playlist loading. |

## Migration Flow

Schema setup is currently code-driven rather than file-based. New installs create
the latest base tables in `initializeTables()` inside `src/database/db.ts`.
Existing installs are upgraded by guarded `ALTER TABLE` checks in the same
function.

The current migration pattern is:

1. Open the database through `getDatabase()`.
2. Run `initializeTables()`.
3. Create base tables with `CREATE TABLE IF NOT EXISTS`.
4. Read existing `songs` columns with `PRAGMA table_info(songs)`.
5. Add missing columns with guarded `ALTER TABLE` statements.
6. Seed the default `Liked Songs` playlist with `INSERT OR IGNORE`.

`src/database/db_migration.ts` contains a one-time data migration that moves
liked songs into the default playlist. It should run after the database is ready
and should not crash app startup if the migration cannot complete.

## Adding Schema Changes

When adding a new column or table:

- Add the latest schema to the `CREATE TABLE IF NOT EXISTS` block so fresh
  installs start with the correct shape.
- Add a guarded migration for existing users. Check the current schema first,
  then run the smallest possible `ALTER TABLE` or data migration.
- Keep migrations idempotent. Re-running initialization should not duplicate
  rows, recreate existing indexes incorrectly, or fail because a column already
  exists.
- Preserve foreign key behavior. Relationship tables should use cascading
  deletes only when deleting the parent should remove the child records.
- Update TypeScript row mappings in `src/database/queries.ts`,
  `src/database/playlistQueries.ts`, and shared types when schema fields are
  exposed to the app.
- Add or update tests for query behavior when the change affects runtime logic.

## Do and Don't

Do:

- Use parameterized `runAsync` or `getAllAsync` calls for new query code.
- Keep default values explicit for columns that existing rows need immediately.
- Document whether boolean-like fields use `0`/`1` or text values.
- Test fresh install and upgrade paths when changing schema.

Don't:

- Remove or rename a column without a data migration plan.
- Assume every user has the newest table shape before migrations run.
- Store secrets, tokens, or private credentials in SQLite.
- Mix unrelated data migrations into a UI or feature-only PR.

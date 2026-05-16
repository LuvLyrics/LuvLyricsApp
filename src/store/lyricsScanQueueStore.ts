import { create } from 'zustand';
import { Song } from '../types/song';

import { lyricaService } from '../services/LyricaService';
import { useSongsStore } from './songsStore';

export interface ScanJob {
  songId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  attempts: number;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  resultType?: 'synced' | 'plain' | 'none';
  isForcedSynced?: boolean;
  log: string[];
}


interface LyricsScanQueueState {
  /** Record keyed by songId for O(1) lookups */
  queue: Record<string, ScanJob>;
  processing: boolean;
  
  addToQueue: (song: Song, forceSynced?: boolean) => void;
  removeFromQueue: (songId: string) => void;
  processQueue: () => Promise<void>;
  getJobStatus: (songId: string) => ScanJob | undefined;
}

export const useLyricsScanQueueStore = create<LyricsScanQueueState>((set, get) => ({
  queue: {},
  processing: false,

  addToQueue: (song: Song, forceSynced?: boolean) => {
    const { queue, processQueue } = get();
    const existing = queue[song.id];
    
    if (existing) {
        // If failed OR (if it's plain and we want synced)
        const isPlainRetry = forceSynced && existing.resultType === 'plain';
        
        if (existing.status === 'failed' || isPlainRetry) {
            set(state => ({
                queue: {
                    ...state.queue,
                    [song.id]: {
                        ...state.queue[song.id],
                        status: 'pending' as const,
                        attempts: 0,
                        isForcedSynced: forceSynced,
                        log: [...state.queue[song.id].log, isPlainRetry ? 'Retrying specifically for synced lyrics...' : 'Retrying...']
                    }
                }
            }));
            if (!get().processing) processQueue();
        }
        return; 
    }

    const newJob: ScanJob = {
      songId: song.id,
      title: song.title,
      artist: song.artist || 'Unknown Artist',
      album: song.album,
      duration: song.duration,
      attempts: 0,
      status: 'pending',
      isForcedSynced: forceSynced,
      log: [`Queued`],
    };

    set({ queue: { ...queue, [song.id]: newJob } });
    
    if (!get().processing) {
      processQueue();
    }
  },

  removeFromQueue: (songId: string) => {
    set(state => {
      const { [songId]: _, ...rest } = state.queue;
      return { queue: rest };
    });
  },
  
  getJobStatus: (songId: string) => {
      return get().queue[songId];
  },

  processQueue: async () => {
    if (get().processing) return;
    set({ processing: true });

    try {
      while (true) {
        const { queue } = get();
        const nextJob = Object.values(queue).find(j => j.status === 'pending');
        
        if (!nextJob) break;

        // Mark as scanning
        set(state => ({
          queue: {
            ...state.queue,
            [nextJob.songId]: { ...state.queue[nextJob.songId], status: 'scanning' as const }
          }
        }));

        const updateJob = (updates: Partial<ScanJob> | ((prev: ScanJob) => Partial<ScanJob>)) => {
            set(state => {
                const prev = state.queue[nextJob.songId];
                if (!prev) return state;
                const newValues = typeof updates === 'function' ? updates(prev) : updates;
                return {
                    queue: {
                        ...state.queue,
                        [nextJob.songId]: { ...prev, ...newValues }
                    }
                };
            });
        };

        updateJob(prev => ({ 
            attempts: prev.attempts + 1, 
            log: [...prev.log, `Searching for lyrics...`] 
        }));

        try {
            // Lyrica Logic: Directly follows Synced Slow -> Synced Fast -> Plain
            // If isForcedSynced is true, we skip plain lyrics
            const result = await lyricaService.fetchLyrics(
                nextJob.title, 
                nextJob.artist, 
                nextJob.isForcedSynced,
                nextJob.duration
            );

            if (!result || !result.lyrics) {
                updateJob(prev => ({ 
                    status: 'failed' as const, 
                    log: [...prev.log, nextJob.isForcedSynced ? 'No synced lyrics found' : 'No lyrics found'] 
                }));
                await new Promise(r => setTimeout(r, 500));
                continue;
            }

            const hasSynced = lyricaService.hasTimestamps(result.lyrics);
            const sourceName = result.source;

            // Parse using Lyrica's parser
            const parsedLyrics = lyricaService.parseLrc(result.lyrics, result.metadata?.duration || nextJob.duration);

            if (parsedLyrics.length === 0) {
                updateJob(prev => ({ status: 'failed' as const, log: [...prev.log, `Failed to parse lyrics`] }));
                await new Promise(r => setTimeout(r, 500));
                continue;
            }

            // Save to Song Store
            const currentSong = await useSongsStore.getState().getSong(nextJob.songId);

            if (!currentSong) {
                updateJob(prev => ({ status: 'failed' as const, log: [...prev.log, `Song not found in DB`] }));
                await new Promise(r => setTimeout(r, 500));
                continue;
            }

            await useSongsStore.getState().updateSong({
                ...currentSong,
                lyrics: parsedLyrics,
                duration: (result.metadata?.duration && result.metadata.duration > 0) 
                            ? result.metadata.duration 
                            : currentSong.duration,
                lyricSource: sourceName,
            });

            updateJob(prev => ({ 
                status: 'completed' as const, 
                resultType: hasSynced ? 'synced' : 'plain', 
                log: [...prev.log, `✅ Saved ${parsedLyrics.length} lines (${sourceName})`] 
            }));

        } catch (error: unknown) {
             const message = error instanceof Error ? error.message : String(error);
             console.error(`[ScanQueue] Error processing "${nextJob.title}":`, error);
             updateJob(prev => ({ status: 'failed' as const, log: [...prev.log, `Error: ${message}`] }));
        }

        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
        console.error("[ScanQueue] Queue processor error:", e);
    } finally {
        set({ processing: false });
    }
  }
}));

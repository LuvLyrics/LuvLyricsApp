import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
    View, Text, StyleSheet, TextInput, Pressable,
    ActivityIndicator, ScrollView, FlatList, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/colors';
import { Toast } from '../components/Toast';
import { MultiSourceSearchService } from '../services/MultiSourceSearchService';
import { UnifiedSong } from '../types/song';
import { useSongsStore } from '../store/songsStore';
import { Audio } from 'expo-av';

import { useDownloaderTabStore, SearchTab as SearchTabState } from '../store/downloaderTabStore';
import { useDownloadQueueStore } from '../store/downloadQueueStore';
import {
    DownloadGridCard,
    BulkSwapModal,
    PlaylistSelectionModal,
} from '../components';
import * as Clipboard from 'expo-clipboard';
import { usePlaylistStore } from '../store/playlistStore';
import { BulkItem } from '../store/downloaderTabStore';
import { useLyricsScanQueueStore } from '../store/lyricsScanQueueStore';
import stringSimilarity from 'string-similarity';
import * as playlistQueries from '../database/playlistQueries';

// --- Sub-components ---

interface ScrollableHeaderProps {
    tabs: SearchTabState[];
    activeTabId: string;
    setActiveTab: (id: string) => void;
    closeTab: (id: string) => void;
    createTab: (query: string) => void;
    selectionMode: boolean;
    setSelectionMode: (mode: boolean) => void;
    activeTabMode: 'search' | 'bulk';
    updateTab: (id: string, updates: Partial<SearchTabState>) => void;
}

const ScrollableHeader: React.FC<ScrollableHeaderProps> = memo(({
    tabs, activeTabId, setActiveTab, closeTab, createTab,
    selectionMode, setSelectionMode, activeTabMode, updateTab
}) => (
    <View style={styles.toolbarRow}>
        <Pressable
            style={[styles.microBtn, selectionMode && styles.microBtnActive]}
            onPress={() => setSelectionMode(!selectionMode)}
        >
            <Ionicons name={selectionMode ? "checkmark-circle" : "checkmark-circle-outline"} size={17} color={selectionMode ? '#fff' : Colors.primary} />
        </Pressable>

        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabBarScroll}
            style={{ flex: 1 }}
        >
            {tabs.map(tab => (
                <Pressable
                    key={tab.id}
                    style={[styles.tabItem, tab.id === activeTabId && styles.activeTabItem]}
                    onPress={() => setActiveTab(tab.id)}
                >
                    <Text style={[styles.tabText, tab.id === activeTabId && styles.activeTabText]} numberOfLines={1}>
                        {tab.query || 'New'}
                    </Text>
                    {tabs.length > 1 && (
                        <Pressable onPress={() => closeTab(tab.id)} style={styles.closeTabBtn}>
                            <Ionicons name="close" size={11} color="#666" />
                        </Pressable>
                    )}
                </Pressable>
            ))}
        </ScrollView>

        <Pressable style={styles.microBtn} onPress={() => createTab('')}>
            <Ionicons name="add" size={18} color="#fff" />
        </Pressable>

        <Pressable
            style={[styles.microBtn, activeTabMode === 'bulk' && styles.microBtnActive]}
            onPress={() => updateTab(activeTabId, { mode: activeTabMode === 'bulk' ? 'search' : 'bulk' })}
        >
            <Ionicons name={activeTabMode === 'bulk' ? 'layers' : 'layers-outline'} size={17} color={activeTabMode === 'bulk' ? '#C084FC' : '#555'} />
        </Pressable>
    </View>
));

interface BulkHeaderProps extends ScrollableHeaderProps {
    bulkPlaylistName: string;
    setBulkPlaylistName: (name: string) => void;
}

const BulkHeader: React.FC<BulkHeaderProps> = memo((props) => (
    <View>
        <ScrollableHeader {...props} />
        <View style={styles.bulkTitleContainer}>
            <Text style={styles.label}>3. NAME YOUR PLAYLIST</Text>
            <TextInput
                style={styles.playlistInput}
                value={props.bulkPlaylistName}
                onChangeText={props.setBulkPlaylistName}
                placeholder="My Awesome Playlist"
                placeholderTextColor="#555"
            />
        </View>
    </View>
));

// --- Main SearchTab ---

// Isolated: no props — reads from stores directly, never re-renders on queue progress
export const AudioDownloaderSearchTab = memo(() => {
    const {
        tabs, activeTabId,
        createTab, closeTab, setActiveTab, updateTab,
        toggleSelection, clearAllSelections, getSelectedSongs,
    } = useDownloaderTabStore();

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' } | null>(null);
    const [selectionMode, setSelectionMode] = useState(false);

    const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
    const [pendingDownloadSongs, setPendingDownloadSongs] = useState<UnifiedSong[]>([]);

    const [searchMode, setSearchMode] = useState<'title' | 'artist'>('title');
    const [titleQuery, setTitleQueryLocal] = useState(activeTab?.titleQuery || '');
    const [artistQuery, setArtistQueryLocal] = useState(activeTab?.artistQuery || '');
    const [remixSectionExpanded, setRemixSectionExpanded] = useState(false);

    const [jsonInput, setJsonInput] = useState('');
    const [bulkPlaylistName, setBulkPlaylistName] = useState('');

    const [swapModalVisible, setSwapModalVisible] = useState(false);
    const [swapTargetItem, setSwapTargetItem] = useState<BulkItem | null>(null);
    const [bulkCandidateMap, setBulkCandidateMap] = useState<Record<string, UnifiedSong[]>>({});
    const [bulkCandidateIndexMap, setBulkCandidateIndexMap] = useState<Record<string, number>>({});
    const [cyclingItemId, setCyclingItemId] = useState<string | null>(null);

    const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
    const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
    const previewSoundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => { previewSoundRef.current = previewSound; }, [previewSound]);

    useEffect(() => {
        return () => { previewSoundRef.current?.unloadAsync(); };
    }, []);

    // Sync local fields when switching tabs
    useEffect(() => {
        if (activeTab) {
            setJsonInput((activeTab.bulkItems && activeTab.bulkItems.length > 0)
                ? JSON.stringify(activeTab.bulkItems.map(i => i.query), null, 2)
                : '');
            setBulkPlaylistName(activeTab.bulkPlaylistName || '');
            setTitleQueryLocal(activeTab.titleQuery || '');
            setArtistQueryLocal(activeTab.artistQuery || '');
            if (activeTab.artistQuery && !activeTab.titleQuery) setSearchMode('artist');
            else setSearchMode('title');
        }
    }, [activeTabId]); // eslint-disable-line react-hooks/exhaustive-deps

    const setTitleQuery = (val: string) => setTitleQueryLocal(val);
    const setArtistQuery = (val: string) => setArtistQueryLocal(val);

    const filterResults = useCallback((results: UnifiedSong[], query: string) => {
        const artistLower = query.toLowerCase().trim();
        return {
            exactMatches: results.filter(s =>
                s.artist.toLowerCase().includes(artistLower) &&
                !s.artist.match(/remix|cover|vs\.|feat\.|ft\./i)
            ),
            remixesAndCovers: results.filter(s =>
                s.artist.toLowerCase().includes(artistLower) &&
                !!s.artist.match(/remix|cover|vs\.|feat\.|ft\./i)
            ),
        };
    }, []);

    const handleSearch = useCallback(async () => {
        let finalQuery = '';
        if (titleQuery && artistQuery) finalQuery = `${titleQuery} ${artistQuery}`;
        else if (artistQuery) finalQuery = artistQuery;
        else if (titleQuery) finalQuery = titleQuery;
        if (!finalQuery.trim()) return;

        updateTab(activeTabId, {
            isSearching: true, status: 'Searching...', results: [], remixResults: [],
            query: finalQuery, titleQuery, artistQuery,
        });

        try {
            if (__DEV__) console.log(`[Tab-${activeTabId.slice(-4)}] Searching: ${finalQuery}`);
            const results = await MultiSourceSearchService.searchMusic(finalQuery, artistQuery, (status) => {
                updateTab(activeTabId, { status });
            });

            if (artistQuery) {
                const { exactMatches, remixesAndCovers } = filterResults(results, artistQuery);
                if (exactMatches.length === 0 && remixesAndCovers.length === 0 && results.length > 0) {
                    updateTab(activeTabId, { results, remixResults: [], isSearching: false, status: '' });
                } else {
                    updateTab(activeTabId, {
                        results: exactMatches, remixResults: remixesAndCovers, isSearching: false,
                        status: exactMatches.length === 0 && remixesAndCovers.length === 0 ? 'No results found.' : '',
                    });
                }
            } else {
                updateTab(activeTabId, {
                    results, remixResults: [], isSearching: false,
                    status: results.length === 0 ? 'No results found.' : '',
                });
            }
        } catch {
            updateTab(activeTabId, { isSearching: false, status: 'Search failed. Check connection and try again.' });
            setToast({ visible: true, message: 'Search failed. Check connection and try again.', type: 'error' });
        }
    }, [activeTabId, titleQuery, artistQuery, updateTab, filterResults]);

    const handlePreviewToggle = async (song: UnifiedSong) => {
        try {
            if (playingPreviewId === song.id && previewSound) {
                await previewSound.pauseAsync();
                setPlayingPreviewId(null);
                return;
            }
            if (previewSound) await previewSound.unloadAsync();
            const { sound } = await Audio.Sound.createAsync({ uri: song.downloadUrl }, { shouldPlay: true });
            setPreviewSound(sound);
            setPlayingPreviewId(song.id);
            sound.setOnPlaybackStatusUpdate(s => { if (s.isLoaded && s.didJustFinish) setPlayingPreviewId(null); });
        } catch {
            setToast({ visible: true, message: 'Preview failed', type: 'error' });
        }
    };

    const openArtistTab = (artistName: string) => { createTab(artistName); };

    useEffect(() => {
        if (activeTab.query && activeTab.results.length === 0 && !activeTab.isSearching && activeTab.status === '') {
            handleSearch();
        }
    }, [activeTabId, activeTab.query, activeTab.results.length, activeTab.isSearching, activeTab.status, handleSearch]);

    const handleLongPress = (song: UnifiedSong) => {
        const allSelectableIds = activeTab.mode === 'bulk'
            ? (activeTab.bulkItems || []).filter(i => !!i.result?.id).map(i => i.result!.id)
            : [...activeTab.results, ...(activeTab.remixResults || [])].map(i => i.id);
        if (allSelectableIds.length === 0) { toggleSelection(activeTabId, song.id); return; }
        const hasAllSelected = allSelectableIds.every(id => activeTab.selectedSongs.includes(id));
        updateTab(activeTabId, { selectedSongs: hasAllSelected ? [] : allSelectableIds });
        setSelectionMode(true);
    };

    const handlePress = (song: UnifiedSong) => {
        if (activeTab.selectedSongs.length > 0 || selectionMode) {
            toggleSelection(activeTabId, song.id);
            return;
        }
        const queueItem: UnifiedSong = {
            ...song,
            highResArt: song.highResArt || song.thumbnail || '',
            downloadUrl: song.downloadUrl || song.streamUrl || '',
            streamUrl: song.downloadUrl || song.streamUrl || '',
            selectedQuality: { url: song.downloadUrl || song.streamUrl || '', quality: '320kbps', format: 'mp3' },
            selectedLyrics: '',
            selectedCoverUri: song.highResArt || song.thumbnail || '',
        };
        setPendingDownloadSongs([queueItem]);
        setPlaylistModalVisible(true);
    };

    const handleBatchDownload = () => {
        const selectedSongs = getSelectedSongs().map(s => s.song);
        if (selectedSongs.length === 0) return;
        if (activeTab.mode === 'bulk') { handleBulkDownloadAction(); return; }
        const queueItems = selectedSongs.map(song => ({
            ...song,
            highResArt: song.highResArt || song.thumbnail || '',
            downloadUrl: song.downloadUrl || song.streamUrl || '',
            streamUrl: song.downloadUrl || song.streamUrl || '',
            selectedQuality: { url: song.downloadUrl || song.streamUrl || '', quality: '320kbps', format: 'mp3' },
            selectedLyrics: '',
            selectedCoverUri: song.highResArt || song.thumbnail || '',
        }));
        setPendingDownloadSongs(queueItems as UnifiedSong[]);
        setPlaylistModalVisible(true);
    };

    const confirmDownload = (targetPlaylistId?: string, playlistName?: string) => {
        if (pendingDownloadSongs.length === 0) return;
        const store = useDownloadQueueStore.getState();
        const newSongs = pendingDownloadSongs.filter(s => !store.queue.find(q => q.id === s.id));
        const duplicates = pendingDownloadSongs.length - newSongs.length;
        if (newSongs.length > 0) {
            store.addToQueue(newSongs, targetPlaylistId);
            let msg = `Added ${newSongs.length} song${newSongs.length > 1 ? 's' : ''} to queue`;
            if (playlistName) msg += ` (Adding to "${playlistName}")`;
            setToast({ visible: true, message: msg, type: 'success' });
        }
        if (duplicates > 0) {
            setToast({
                visible: true,
                message: newSongs.length === 0 ? 'Song already in queue!' : `Added ${newSongs.length}, skipped ${duplicates} duplicates`,
                type: newSongs.length === 0 ? 'error' : 'success',
            });
        }
        setPendingDownloadSongs([]);
        setPlaylistModalVisible(false);
        clearAllSelections();
        setSelectionMode(false);
    };

    // --- Bulk Logic ---
    const handleSwap = (item: BulkItem) => { setSwapTargetItem(item); setSwapModalVisible(true); };

    const handleCycleNextCandidate = async (item: BulkItem) => {
        if (!item.result) return;
        setCyclingItemId(item.id);
        try {
            let candidates = bulkCandidateMap[item.id] || [];
            if (candidates.length === 0) {
                const query = `${item.query.title} ${item.query.artist}`.trim();
                candidates = await MultiSourceSearchService.searchMusic(query, item.query.artist);
                setBulkCandidateMap(prev => ({ ...prev, [item.id]: candidates }));
            }
            if (candidates.length === 0) { setToast({ visible: true, message: 'No alternate matches found', type: 'error' }); return; }
            const currentIndex = bulkCandidateIndexMap[item.id] ?? candidates.findIndex(c => c.id === item.result?.id);
            const normalizedCurrent = currentIndex >= 0 ? currentIndex : 0;
            const nextIndex = (normalizedCurrent + 1) % candidates.length;
            const updatedItems = activeTab.bulkItems?.map(i =>
                i.id === item.id ? { ...i, result: candidates[nextIndex], status: 'found' as const } : i
            );
            updateTab(activeTabId, { bulkItems: updatedItems });
            setBulkCandidateIndexMap(prev => ({ ...prev, [item.id]: nextIndex }));
        } catch {
            setToast({ visible: true, message: 'Could not fetch next match', type: 'error' });
        } finally {
            setCyclingItemId(null);
        }
    };

    const onSwapConfirm = (newSong: UnifiedSong) => {
        if (!swapTargetItem) return;
        const updatedItems = activeTab.bulkItems?.map(i =>
            i.id === swapTargetItem.id ? { ...i, result: newSong, status: 'found' as const } : i
        );
        updateTab(activeTabId, { bulkItems: updatedItems });
        const existing = bulkCandidateMap[swapTargetItem.id] || [];
        const foundIndex = existing.findIndex(s => s.id === newSong.id);
        if (foundIndex >= 0) {
            setBulkCandidateIndexMap(prev => ({ ...prev, [swapTargetItem.id]: foundIndex }));
        } else {
            setBulkCandidateMap(prev => ({ ...prev, [swapTargetItem.id]: [newSong, ...existing] }));
            setBulkCandidateIndexMap(prev => ({ ...prev, [swapTargetItem.id]: 0 }));
        }
        setSwapModalVisible(false);
        setSwapTargetItem(null);
    };

    const copyPromptToClipboard = async () => {
        await Clipboard.setStringAsync(`Please generate a JSON list of songs for me.
Format:
[
  { "title": "Song Title", "artist": "Artist Name" }
]
Only provide the JSON array, no other text.`);
        setToast({ visible: true, message: 'Prompt copied to clipboard!', type: 'success' });
    };

    const parseBulkInput = (input: string): Array<{ title?: string; artist?: string }> => {
        try {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) return parsed;
        } catch { /* fall through */ }
        const objectChunks = input.match(/\{[\s\S]*?\}/g) || [];
        const extracted = objectChunks
            .map(chunk => {
                const match = chunk.match(/["']title["']\s*:\s*["']([\s\S]*?)["']\s*,\s*["']artist["']\s*:\s*["']([\s\S]*?)["']/i);
                if (!match) return null;
                return { title: (match[1] || '').trim(), artist: (match[2] || '').trim() };
            })
            .filter((item): item is { title: string; artist: string } => item !== null);
        if (extracted.length === 0) throw new Error('Invalid JSON format');
        return extracted;
    };

    const parseAndSearchBulk = async () => {
        try {
            const parsed = parseBulkInput(jsonInput);
            const bulkItems: BulkItem[] = parsed.map((item, index) => ({
                id: `bulk-${Date.now()}-${index}`,
                query: { title: item.title || '', artist: item.artist || '' },
                result: null,
                status: 'pending',
                originalIndex: index,
            }));
            updateTab(activeTabId, { bulkItems, status: 'Searching...', isSearching: true });

            for (let i = 0; i < bulkItems.length; i++) {
                const latestTab = useDownloaderTabStore.getState().tabs.find(t => t.id === activeTabId);
                if (!latestTab?.bulkItems) break;
                const currentItem = latestTab.bulkItems[i];
                if (!currentItem || currentItem.status === 'found') continue;

                const searchingItems = [...latestTab.bulkItems];
                searchingItems[i] = { ...searchingItems[i], status: 'searching' };
                updateTab(activeTabId, { bulkItems: searchingItems });

                const queryTitle = currentItem.query.title.toLowerCase().trim();
                const queryArtist = currentItem.query.artist.toLowerCase().trim();

                try {
                    const localSongs = useSongsStore.getState().songs;
                    const existingSong = localSongs.find(s =>
                        s.title.toLowerCase().trim() === queryTitle &&
                        (s.artist || '').toLowerCase().trim() === queryArtist
                    );
                    const reReadTab = useDownloaderTabStore.getState().tabs.find(t => t.id === activeTabId);
                    if (!reReadTab?.bulkItems) break;
                    const updatedItems = [...reReadTab.bulkItems];

                    if (existingSong) {
                        updatedItems[i] = {
                            ...updatedItems[i], status: 'already_present',
                            result: {
                                id: existingSong.id, title: existingSong.title,
                                artist: existingSong.artist || 'Unknown Artist',
                                highResArt: existingSong.coverImageUri || '',
                                downloadUrl: existingSong.audioUri || '',
                                source: 'Local', isLocal: true, duration: existingSong.duration,
                            },
                        };
                    } else {
                        const query = `${currentItem.query.title} ${currentItem.query.artist}`;
                        const results = await MultiSourceSearchService.searchMusic(query, currentItem.query.artist);
                        if (results.length > 0) {
                            const matches = results
                                .map(r => ({
                                    result: r,
                                    rating: stringSimilarity.compareTwoStrings(
                                        `${queryTitle} ${queryArtist}`,
                                        `${r.title.toLowerCase()} ${r.artist.toLowerCase()}`
                                    ),
                                }))
                                .sort((a, b) => b.rating - a.rating);
                            const bestMatch = matches[0].rating > 0.4 ? matches[0].result : results[0];
                            const bestMatchIndex = results.findIndex(r => r.id === bestMatch.id);
                            setBulkCandidateMap(prev => ({ ...prev, [currentItem.id]: results }));
                            setBulkCandidateIndexMap(prev => ({ ...prev, [currentItem.id]: bestMatchIndex >= 0 ? bestMatchIndex : 0 }));
                            updatedItems[i] = { ...updatedItems[i], status: 'found', result: bestMatch };
                        } else {
                            setBulkCandidateMap(prev => ({ ...prev, [currentItem.id]: [] }));
                            setBulkCandidateIndexMap(prev => ({ ...prev, [currentItem.id]: 0 }));
                            updatedItems[i] = { ...updatedItems[i], status: 'not_found' };
                        }
                    }
                    updateTab(activeTabId, { bulkItems: updatedItems });
                } catch (error) {
                    if (__DEV__) console.warn(`[BulkSearch] Item ${i} failed:`, error);
                    const tabAfterError = useDownloaderTabStore.getState().tabs.find(t => t.id === activeTabId);
                    if (tabAfterError?.bulkItems) {
                        const errorItems = [...tabAfterError.bulkItems];
                        errorItems[i] = { ...errorItems[i], status: 'not_found' };
                        updateTab(activeTabId, { bulkItems: errorItems });
                    }
                }
                await new Promise(r => setTimeout(r, 600));
            }
            updateTab(activeTabId, { isSearching: false, status: 'Completed' });
        } catch {
            setToast({ visible: true, message: 'Invalid JSON format', type: 'error' });
            updateTab(activeTabId, { isSearching: false });
        }
    };

    const handleBulkDownloadAction = async () => {
        if (!bulkPlaylistName.trim()) {
            setToast({ visible: true, message: 'Please enter a playlist name', type: 'error' });
            return;
        }
        const validItems = activeTab.bulkItems?.filter(i => i.result) || [];
        if (validItems.length === 0) {
            setToast({ visible: true, message: 'No songs found to download', type: 'error' });
            return;
        }
        try {
            setToast({ visible: true, message: 'Creating playlist...', type: 'success' });
            const playlistId = await usePlaylistStore.getState().createPlaylist(bulkPlaylistName);
            const downloadItems = validItems.filter(i => i.status === 'found');
            const localItems = validItems.filter(i => i.status === 'already_present');

            if (downloadItems.length > 0) {
                const songsToDownload = downloadItems.map(i => i.result!);
                const sortOrders = downloadItems.map(i => i.originalIndex);
                const queueItems = songsToDownload.map(song => ({
                    ...song,
                    highResArt: song.highResArt || song.thumbnail || '',
                    downloadUrl: song.downloadUrl || song.streamUrl || '',
                    streamUrl: song.downloadUrl || song.streamUrl || '',
                    selectedQuality: { url: song.downloadUrl || song.streamUrl || '', quality: '320kbps', format: 'mp3' },
                    selectedLyrics: '',
                    selectedCoverUri: song.highResArt || song.thumbnail || '',
                }));
                useDownloadQueueStore.getState().addToQueue(queueItems as UnifiedSong[], playlistId, sortOrders);
            }

            if (localItems.length > 0) {
                for (const item of localItems) {
                    const songId = item.result!.id;
                    await playlistQueries.addSongToPlaylistWithOrder(playlistId, songId, item.originalIndex);
                    const song = useSongsStore.getState().songs.find(s => s.id === songId);
                    if (song) {
                        const hasSynced = song.lyrics && song.lyrics.some(l => l.timestamp && l.timestamp > 0);
                        if (!hasSynced) useLyricsScanQueueStore.getState().addToQueue(song, true);
                    }
                }
                await usePlaylistStore.getState().fetchPlaylists();
            }

            let msg = `Playlist '${bulkPlaylistName}' created! `;
            if (downloadItems.length > 0 && localItems.length > 0) msg += `Downloading ${downloadItems.length} and adding ${localItems.length} existing songs.`;
            else if (downloadItems.length > 0) msg += `Downloading ${downloadItems.length} songs.`;
            else if (localItems.length > 0) msg += `Added ${localItems.length} existing songs.`;
            setToast({ visible: true, message: msg, type: 'success' });
        } catch {
            setToast({ visible: true, message: 'Failed to process bulk download', type: 'error' });
        }
    };

    const selectedCount = getSelectedSongs().length;
    const readyBulkCount = activeTab.bulkItems?.filter(i => i.result).length || 0;
    const showBottomActionBar = selectedCount > 0 || (activeTab.mode === 'bulk' && readyBulkCount > 0);

    const sharedHeaderProps = {
        tabs, activeTabId, setActiveTab, closeTab, createTab,
        selectionMode, setSelectionMode,
        activeTabMode: activeTab.mode,
        updateTab,
    };

    return (
        <View style={styles.container}>
            {/* Search input */}
            <View style={styles.searchRow}>
                <View style={styles.searchBarContainer}>
                    <TextInput
                        style={styles.unifiedInput}
                        placeholder={searchMode === 'title' ? 'Song title...' : 'Artist name...'}
                        placeholderTextColor="#666"
                        value={searchMode === 'title' ? titleQuery : artistQuery}
                        onChangeText={text => { if (searchMode === 'title') setTitleQuery(text); else setArtistQuery(text); }}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {(titleQuery || artistQuery) ? (
                        <Pressable onPress={() => { setTitleQuery(''); setArtistQuery(''); }} style={styles.clearSearchBtn}>
                            <Ionicons name="close-circle" size={16} color="#666" />
                        </Pressable>
                    ) : null}
                    <Pressable style={styles.searchModePill} onPress={() => setSearchMode(searchMode === 'title' ? 'artist' : 'title')}>
                        <Text style={styles.searchModePillText}>{searchMode === 'title' ? 'Title' : 'Artist'}</Text>
                    </Pressable>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {activeTab.mode === 'bulk' ? (
                    <View style={styles.bulkContainer}>
                        {(!activeTab.bulkItems || activeTab.bulkItems.length === 0) ? (
                            <ScrollView>
                                <ScrollableHeader {...sharedHeaderProps} />
                                <View style={{ paddingHorizontal: 16 }}>
                                    <Text style={styles.label}>1. GET JSON FROM AI</Text>
                                    <Pressable style={styles.copyPromptBtn} onPress={copyPromptToClipboard}>
                                        <Text style={styles.copyPromptText}>Copy Prompt for ChatGPT</Text>
                                    </Pressable>
                                    <Text style={styles.label}>2. PASTE JSON HERE</Text>
                                    <TextInput
                                        style={styles.jsonInput}
                                        value={jsonInput}
                                        onChangeText={setJsonInput}
                                        placeholder={'[\n  { "title": "Song", "artist": "Artist" }\n]'}
                                        placeholderTextColor="#555"
                                        multiline
                                    />
                                    <Pressable style={styles.parseBtn} onPress={parseAndSearchBulk}>
                                        {activeTab.isSearching
                                            ? <ActivityIndicator color="#fff" />
                                            : <Ionicons name="search" size={20} color="#fff" />}
                                        <Text style={styles.parseBtnText}>Parse & Search</Text>
                                    </Pressable>
                                </View>
                            </ScrollView>
                        ) : (
                            <>
                                <FlatList
                                    key={`bulk-${activeTabId}`}
                                    data={activeTab.bulkItems}
                                    ListHeaderComponent={
                                        <BulkHeader
                                            {...sharedHeaderProps}
                                            bulkPlaylistName={bulkPlaylistName}
                                            setBulkPlaylistName={t => { setBulkPlaylistName(t); updateTab(activeTabId, { bulkPlaylistName: t }); }}
                                        />
                                    }
                                    keyExtractor={item => item.id}
                                    numColumns={2}
                                    contentContainerStyle={{ paddingBottom: 100 }}
                                    renderItem={({ item }) => {
                                        if (!item.result) {
                                            return (
                                                <View style={{ width: '50%', padding: 4 }}>
                                                    <View style={styles.bulkPlaceholder}>
                                                        {item.status === 'searching'
                                                            ? <ActivityIndicator color={Colors.primary} />
                                                            : <Ionicons name="refresh-circle" size={40} color={Colors.primary} />}
                                                        <Text style={styles.bulkPlaceholderTitle}>
                                                            {item.status === 'not_found' ? 'No match yet' : 'Ready to search'}
                                                        </Text>
                                                        <Text style={styles.bulkPlaceholderQuery}>{item.query.title}</Text>
                                                        <Text style={styles.bulkPlaceholderArtist}>{item.query.artist}</Text>
                                                        <Pressable onPress={() => handleSwap(item)} style={styles.bulkActionBtn}>
                                                            <Ionicons name="search" size={14} color="#fff" />
                                                            <Text style={styles.bulkActionBtnText}>Retry manually</Text>
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            );
                                        }
                                        return (
                                            <View style={styles.gridCardWrapper}>
                                                <DownloadGridCard
                                                    song={item.result}
                                                    isSelected
                                                    isPlayingPreview={playingPreviewId === item.result?.id}
                                                    onPress={() => handleSwap(item)}
                                                    onLongPress={() => {}}
                                                    onPlayPress={() => handlePreviewToggle(item.result!)}
                                                    onArtistPress={() => {}}
                                                    selectionMode={false}
                                                />
                                                <View style={styles.swapOverlay}><Ionicons name="sync" size={12} color="#fff" /></View>
                                                {item.status === 'already_present' && (
                                                    <View style={styles.alreadyPresentOverlay}>
                                                        <View style={styles.alreadyPresentBadge}>
                                                            <Ionicons name="library" size={14} color="#fff" />
                                                            <Text style={styles.alreadyPresentBadgeText}>Already in Library</Text>
                                                        </View>
                                                        <Text style={styles.alreadyPresentText}>we will import to ur library dont worry!</Text>
                                                    </View>
                                                )}
                                                <Pressable onPress={() => handleCycleNextCandidate(item)} style={[styles.bulkActionBtn, styles.bulkNextBtn]}>
                                                    {cyclingItemId === item.id
                                                        ? <ActivityIndicator color="#fff" size="small" />
                                                        : (<>
                                                            <Ionicons name="play-skip-forward" size={14} color="#fff" />
                                                            <Text style={styles.bulkActionBtnText}>Next match</Text>
                                                        </>)}
                                                </Pressable>
                                            </View>
                                        );
                                    }}
                                />
                                {activeTab.mode === 'bulk' && readyBulkCount > 0 && (
                                    <View style={styles.actionBar}>
                                        <Text style={styles.selectionText}>{readyBulkCount} songs ready</Text>
                                        <Pressable style={styles.reviewBtn} onPress={handleBulkDownloadAction}>
                                            <Text style={styles.reviewBtnText}>Download All to Playlist</Text>
                                            <Ionicons name="download" size={18} color="#fff" />
                                        </Pressable>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                ) : activeTab.isSearching ? (
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                        <ScrollableHeader {...sharedHeaderProps} />
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={styles.statusText}>{activeTab.status}</Text>
                        </View>
                    </ScrollView>
                ) : activeTab.results.length > 0 || (activeTab.remixResults && activeTab.remixResults.length > 0) ? (
                    activeTab.remixResults && activeTab.remixResults.length > 0 ? (
                        <SectionList
                            key={`section-${activeTabId}`}
                            ListHeaderComponent={<ScrollableHeader {...sharedHeaderProps} />}
                            sections={[
                                ...(activeTab.results.length > 0 ? [{ title: 'OFFICIAL TRACKS', data: activeTab.results }] : []),
                                { title: 'REMIXES & COVERS', data: activeTab.remixResults, collapsed: !remixSectionExpanded },
                            ]}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.gridContent}
                            renderSectionHeader={({ section }) => (
                                <Pressable
                                    onPress={() => { if (section.title === 'REMIXES & COVERS') setRemixSectionExpanded(v => !v); }}
                                    style={styles.sectionHeader}
                                >
                                    <Text style={styles.sectionHeaderText}>{section.title} ({section.data.length})</Text>
                                    {section.title === 'REMIXES & COVERS' && (
                                        <Ionicons name={remixSectionExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
                                    )}
                                </Pressable>
                            )}
                            renderItem={({ item, section }) => {
                                if (section.title === 'REMIXES & COVERS' && !remixSectionExpanded) return null;
                                return (
                                    <View style={{ width: '50%', padding: 4 }}>
                                        <DownloadGridCard
                                            song={item}
                                            isSelected={activeTab.selectedSongs.includes(item.id)}
                                            isPlayingPreview={playingPreviewId === item.id}
                                            onPress={() => handlePress(item)}
                                            onLongPress={() => handleLongPress(item)}
                                            onPlayPress={() => handlePreviewToggle(item)}
                                            onArtistPress={() => openArtistTab(item.artist)}
                                            selectionMode={selectionMode || activeTab.selectedSongs.length > 0}
                                        />
                                    </View>
                                );
                            }}
                        />
                    ) : (
                        <FlatList
                            key={`results-${activeTabId}`}
                            ListHeaderComponent={<ScrollableHeader {...sharedHeaderProps} />}
                            data={activeTab.results}
                            keyExtractor={item => item.id}
                            numColumns={2}
                            contentContainerStyle={styles.gridContent}
                            renderItem={({ item }) => (
                                <DownloadGridCard
                                    song={item}
                                    isSelected={activeTab.selectedSongs.includes(item.id)}
                                    isPlayingPreview={playingPreviewId === item.id}
                                    onPress={() => handlePress(item)}
                                    onLongPress={() => handleLongPress(item)}
                                    onPlayPress={() => handlePreviewToggle(item)}
                                    onArtistPress={() => openArtistTab(item.artist)}
                                    selectionMode={selectionMode || activeTab.selectedSongs.length > 0}
                                />
                            )}
                        />
                    )
                ) : (
                    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                        <ScrollableHeader {...sharedHeaderProps} />
                        <View style={styles.center}>
                            <Ionicons name="musical-notes-outline" size={64} color="#333" />
                            <Text style={styles.emptyText}>
                                {activeTab.status || 'Search for your favorite songs to download.'}
                            </Text>
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Selection action bar */}
            {selectedCount > 0 && (
                <View style={styles.actionBar}>
                    <Text style={styles.selectionText}>{selectedCount} selected</Text>
                    <Pressable style={styles.reviewBtn} onPress={handleBatchDownload}>
                        <Text style={styles.reviewBtnText}>Download Selected</Text>
                        <Ionicons name="download" size={18} color="#fff" />
                    </Pressable>
                    <Pressable style={styles.clearBtn} onPress={clearAllSelections}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </Pressable>
                </View>
            )}

            {/* Modals */}
            {activeTab.mode === 'bulk' && swapTargetItem && (
                <BulkSwapModal
                    visible={swapModalVisible}
                    initialQuery={swapTargetItem.query}
                    onClose={() => setSwapModalVisible(false)}
                    onSelect={onSwapConfirm}
                />
            )}
            <PlaylistSelectionModal
                visible={playlistModalVisible}
                onClose={() => setPlaylistModalVisible(false)}
                onSelect={(id, name) => confirmDownload(id, name)}
                onSkip={() => confirmDownload(undefined)}
            />
            {toast && (
                <Toast visible={toast.visible} message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1 },
    searchRow: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        paddingTop: 4,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 22,
        height: 46,
        paddingRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(127,19,236,0.25)',
    },
    unifiedInput: {
        flex: 1, color: '#fff', fontSize: 15, height: '100%',
        paddingLeft: 12, paddingRight: 8,
    },
    clearSearchBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
    searchModePill: {
        backgroundColor: 'rgba(127,19,236,0.28)', borderRadius: 14,
        minWidth: 66, height: 30, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 10, marginLeft: 6, borderWidth: 1, borderColor: 'rgba(127,19,236,0.45)',
    },
    searchModePillText: { color: '#C084FC', fontSize: 12, fontWeight: '700' },
    toolbarRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 5, gap: 6, marginBottom: 3,
    },
    microBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    microBtnActive: { backgroundColor: 'rgba(127,19,236,0.32)', borderColor: 'rgba(127,19,236,0.5)' },
    tabItem: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, marginRight: 6,
        borderWidth: 1, borderColor: 'transparent',
    },
    activeTabItem: { backgroundColor: 'rgba(127,19,236,0.22)', borderColor: 'rgba(127,19,236,0.45)' },
    tabText: { color: '#555', fontSize: 12, fontWeight: '600', maxWidth: 100 },
    activeTabText: { color: '#C084FC', fontWeight: '700' },
    tabBarScroll: { alignItems: 'center', paddingVertical: 3 },
    closeTabBtn: { marginLeft: 5 },
    bulkTitleContainer: { paddingHorizontal: 16, marginBottom: 16 },
    content: { flex: 1 },
    gridContent: { padding: 12, paddingBottom: 120 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statusText: { color: '#666', marginTop: 16, fontSize: 13 },
    emptyText: { color: '#444', marginTop: 16, fontSize: 16 },
    actionBar: {
        position: 'absolute', bottom: 24, left: 24, right: 24,
        backgroundColor: '#1E1E1E', borderRadius: 24,
        flexDirection: 'row', alignItems: 'center',
        padding: 12, paddingHorizontal: 20,
        elevation: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 12,
        borderWidth: 1, borderColor: '#333',
    },
    selectionText: { color: '#fff', fontSize: 15, fontWeight: 'bold', flex: 1 },
    reviewBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 20, gap: 8, marginRight: 8,
    },
    reviewBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    clearBtn: { padding: 8 },
    bulkContainer: { padding: 16, flex: 1 },
    label: { color: '#666', marginBottom: 8, marginTop: 16, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
    playlistInput: { backgroundColor: 'rgba(255,255,255,0.07)', color: '#fff', padding: 14, borderRadius: 18, fontSize: 16, borderWidth: 1, borderColor: 'rgba(127,19,236,0.25)' },
    jsonInput: { backgroundColor: 'rgba(255,255,255,0.07)', color: '#ccc', padding: 12, borderRadius: 18, fontSize: 13, height: 160, textAlignVertical: 'top', fontFamily: 'monospace', borderWidth: 1, borderColor: 'rgba(127,19,236,0.25)' },
    copyPromptBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#1E1E1E', borderRadius: 20, marginTop: 12 },
    copyPromptText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
    parseBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    parseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8, marginHorizontal: 4 },
    sectionHeaderText: { color: '#444', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
    gridCardWrapper: { width: '50%', padding: 4 },
    swapOverlay: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 40, pointerEvents: 'none' },
    alreadyPresentOverlay: {
        position: 'absolute', bottom: 8, left: 8, right: 8,
        backgroundColor: 'rgba(0,0,0,0.85)', padding: 10, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.primary + '44',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
    },
    alreadyPresentBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, marginBottom: 6, gap: 4 },
    alreadyPresentBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    alreadyPresentText: { color: '#ccc', fontSize: 10, textAlign: 'center', lineHeight: 14, fontWeight: '500' },
    bulkActionBtn: {
        marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(127,19,236,0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
    },
    bulkActionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    bulkNextBtn: { position: 'absolute', bottom: 10, right: 10, marginTop: 0, backgroundColor: 'rgba(0,0,0,0.72)' },
    bulkPlaceholder: {
        height: 200, backgroundColor: '#111', borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#222', paddingHorizontal: 8,
    },
    bulkPlaceholderTitle: { color: '#fff', marginTop: 8, fontSize: 12, textAlign: 'center', fontWeight: 'bold' },
    bulkPlaceholderQuery: { color: '#666', marginTop: 4, fontSize: 12, textAlign: 'center', paddingHorizontal: 8 },
    bulkPlaceholderArtist: { color: '#444', fontSize: 10, textAlign: 'center' },
});

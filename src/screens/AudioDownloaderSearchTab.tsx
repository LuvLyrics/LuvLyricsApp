import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
    View, Text, StyleSheet, TextInput, Pressable,
    ActivityIndicator, ScrollView, FlatList, SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../contexts/ThemeContext';
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
}) => {
    const colors = useThemeColors();
    return (
    <View style={styles.toolbarRow}>
        <Pressable
            style={[styles.microBtn, selectionMode && styles.microBtnActive]}
            onPress={() => setSelectionMode(!selectionMode)}
        >
            <Ionicons name={selectionMode ? "checkmark-circle" : "checkmark-circle-outline"} size={17} color={selectionMode ? '#fff' : colors.primary} />
        </Pressable>
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
            <Ionicons name={activeTabMode === 'bulk' ? 'layers' : 'layers-outline'} size={17} color={activeTabMode === 'bulk' ? '#7BBEFF' : '#555'} />
        </Pressable>
    </View>
    );
});

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
    const colors = useThemeColors();

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
                                                            ? <ActivityIndicator color={colors.primary} />
                                                            : <Ionicons name="refresh-circle" size={40} color={colors.primary} />}
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
                            <ActivityIndicator size="large" color={colors.primary} />
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
        borderColor: 'rgba(47,140,255,0.22)',
    },
    unifiedInput: {
        flex: 1, color: '#fff', fontSize: 15, height: '100%',
        paddingLeft: 12, paddingRight: 8,
    },
    clearSearchBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
    searchModePill: {
        backgroundColor: 'rgba(47,140,255,0.20)', borderRadius: 14,
        minWidth: 66, height: 30, alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 10, marginLeft: 6, borderWidth: 1, borderColor: 'rgba(47,140,255,0.4)',
    },
    searchModePillText: { color: '#7BBEFF', fontSize: 12, fontWeight: '700' },
    toolbarRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 10, paddingVertical: 5, gap: 6, marginBottom: 3,
    },
    microBtn: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    microBtnActive: { backgroundColor: 'rgba(47,140,255,0.25)', borderColor: 'rgba(47,140,255,0.45)' },
    tabItem: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, marginRight: 6,
        borderWidth: 1, borderColor: 'transparent',
    },
    activeTabItem: { backgroundColor: 'rgba(47,140,255,0.18)', borderColor: 'rgba(47,140,255,0.38)' },
    tabText: { color: '#555', fontSize: 12, fontWeight: '600', maxWidth: 100 },
    activeTabText: { color: '#7BBEFF', fontWeight: '700' },
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
        backgroundColor: '#2F8CFF', paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 20, gap: 8, marginRight: 8,
    },
    reviewBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    clearBtn: { padding: 8 },
    bulkContainer: { padding: 16, flex: 1 },
    label: { color: '#666', marginBottom: 8, marginTop: 16, fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
    playlistInput: { backgroundColor: 'rgba(255,255,255,0.07)', color: '#fff', padding: 14, borderRadius: 18, fontSize: 16, borderWidth: 1, borderColor: 'rgba(47,140,255,0.22)' },
    jsonInput: { backgroundColor: 'rgba(255,255,255,0.07)', color: '#ccc', padding: 12, borderRadius: 18, fontSize: 13, height: 160, textAlignVertical: 'top', fontFamily: 'monospace', borderWidth: 1, borderColor: 'rgba(47,140,255,0.22)' },
    copyPromptBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#1E1E1E', borderRadius: 20, marginTop: 12 },
    copyPromptText: { color: '#2F8CFF', fontSize: 12, fontWeight: '600' },
    parseBtn: { backgroundColor: '#2F8CFF', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 32, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    parseBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8, marginHorizontal: 4 },
    sectionHeaderText: { color: '#444', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
    gridCardWrapper: { width: '50%', padding: 4 },
    swapOverlay: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.6)', padding: 4, borderRadius: 40, pointerEvents: 'none' },
    alreadyPresentOverlay: {
        position: 'absolute', bottom: 8, left: 8, right: 8,
        backgroundColor: 'rgba(0,0,0,0.85)', padding: 10, borderRadius: 12,
        borderWidth: 1, borderColor: '#2F8CFF44',
        alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
    },
    alreadyPresentBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2F8CFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, marginBottom: 6, gap: 4 },
    alreadyPresentBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    alreadyPresentText: { color: '#ccc', fontSize: 10, textAlign: 'center', lineHeight: 14, fontWeight: '500' },
    bulkActionBtn: {
        marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(47,140,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
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

import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecentlyPlayedGrid, RecentlyPlayedMode } from './RecentlyPlayedGrid';
import { Song } from '../types/song';

interface LibraryHeaderProps {
  hasSongs: boolean;
  onSongPress: (song: Song) => void;
  onSongLongPress: (song: Song) => void;
  onLikePress: (id: string) => void;
  onMagicPress: (song: Song) => void;
  activeDownloadsCount: number;
  onOpenQueueModal: () => void;
  onNavigateAudioDownloader: () => void;
  onAddPress: () => void;
  searchQuery: string;
  onSearchQueryChange: (text: string) => void;
  isSearchFocused: boolean;
  onSearchFocus: () => void;
  onSearchCancel: () => void;
  currentSong: Song | null;
  recentlyPlayedMode: RecentlyPlayedMode;
  onHeaderLayout: (height: number) => void;
  isDark: boolean;
  colors: {
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
  };
}

const LibraryHeader: React.FC<LibraryHeaderProps> = ({
  hasSongs,
  onSongPress,
  onSongLongPress,
  onLikePress,
  onMagicPress,
  activeDownloadsCount,
  onOpenQueueModal,
  onNavigateAudioDownloader,
  onAddPress,
  searchQuery,
  onSearchQueryChange,
  isSearchFocused,
  onSearchFocus,
  onSearchCancel,
  currentSong,
  recentlyPlayedMode,
  onHeaderLayout,
  isDark,
  colors,
}) => {
  if (!hasSongs) return null;

  return (
    <View>
      <View onLayout={(e) => onHeaderLayout(e.nativeEvent.layout.height)}>
        <RecentlyPlayedGrid
          onSongPress={onSongPress}
          onSongLongPress={onSongLongPress}
          onLikePress={onLikePress}
          onMagicPress={onMagicPress}
          mode={recentlyPlayedMode}
          currentSong={currentSong}
          style={styles.recentlyPlayedGrid}
        />
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : colors.textPrimary }]}>All Songs</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.actionButton} onPress={onOpenQueueModal}>
              <Ionicons name="list" size={22} color={isDark ? '#fff' : colors.textSecondary} />
              {activeDownloadsCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeDownloadsCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onNavigateAudioDownloader}>
              <Ionicons name="cloud-download-outline" size={22} color={isDark ? '#fff' : colors.textSecondary} />
            </Pressable>
            <Pressable style={styles.actionButton} onPress={onAddPress}>
              <Ionicons name="add" size={24} color={isDark ? '#fff' : colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </View>
      <View style={styles.searchRow}>
        <View style={[styles.searchBarContainer, styles.searchBarFlex, {
          backgroundColor: isDark ? (isSearchFocused ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)') : (isSearchFocused ? '#E0E0E5' : '#E8E8ED'),
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
        }]}>
          <Ionicons name="search" size={20} color={isDark ? '#FFF' : colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#fff' : colors.textPrimary }]}
            placeholder="Filter local library..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : colors.textMuted}
            value={searchQuery}
            onFocus={onSearchFocus}
            returnKeyType="search"
            onChangeText={(text) => {
              onSearchQueryChange(text);
              if (!isSearchFocused && text.length > 0) {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              }
            }}
          />
          {searchQuery ? (
            <Pressable onPress={() => onSearchQueryChange('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {isSearchFocused && (
          <Pressable onPress={onSearchCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  recentlyPlayedGrid: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 16, paddingRight: 16 },
  actionButton: { padding: 4, position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#007AFF', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1, borderColor: '#000' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20 },
  searchBarFlex: { flex: 1, marginHorizontal: 0, marginBottom: 0 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, height: 48, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchIcon: { marginLeft: 12 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16, height: '100%', paddingHorizontal: 12 },
  clearButton: { padding: 8 },
  cancelButton: { marginLeft: 12 },
  cancelText: { color: '#1DB954', fontSize: 16, fontWeight: '600' },
});

export default React.memo(LibraryHeader);

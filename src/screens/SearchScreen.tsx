/**
 * LyricFlow - Search Screen
 * Real-time search with filter chips
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackScreenProps } from '../types/navigation';
import { useSongsStore } from '../store/songsStore';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { SongCard } from '../components';
import { Colors } from '../constants/colors';
import { Song } from '../types/song';
import { getGradientById, GRADIENTS } from '../constants/gradients';

type Props = RootStackScreenProps<'Search'>;

const SearchScreen: React.FC<Props> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [results, setResults] = useState<Song[]>([]);
  const [filterAudio, setFilterAudio] = useState<'all' | 'audio' | 'no-audio'>('all');
  const [filterTimestamp, setFilterTimestamp] = useState<'all' | 'timestamp' | 'no-timestamp'>('all');
  const searchSongs = useSongsStore(state => state.searchSongs);
  const setCurrentSong = useSongsStore(state => state.setCurrentSong);
  const toggleLike = useSongsStore(state => state.toggleLike);
  const setMiniPlayerHidden = usePlayerStore(state => state.setMiniPlayerHidden);
  const playerCurrentSong = usePlayerStore(state => state.currentSong);
  const playInMiniPlayerOnly = useSettingsStore(state => state.playInMiniPlayerOnly);

  const handleSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (text.trim().length > 0) {
      let found = await searchSongs(text);
      
      // Apply audio filter
      if (filterAudio === 'audio') {
        found = found.filter(s => s.audioUri);
      } else if (filterAudio === 'no-audio') {
        found = found.filter(s => !s.audioUri);
      }
      
      // Apply timestamp filter
      if (filterTimestamp === 'timestamp') {
        found = found.filter(s => s.lyrics.some(l => l.timestamp > 0));
      } else if (filterTimestamp === 'no-timestamp') {
        found = found.filter(s => !s.lyrics.some(l => l.timestamp > 0));
      }
      
      setResults(found);
    } else {
      setResults([]);
    }
  }, [searchSongs, filterAudio, filterTimestamp]);

  // Visibility Management: Hide MiniPlayer when Search is open
  React.useEffect(() => {
    setMiniPlayerHidden(true);
    return () => setMiniPlayerHidden(false);
  }, [setMiniPlayerHidden]);

  // Re-run search when filters change
  React.useEffect(() => {
    if (query.trim().length > 0) {
      handleSearch(query);
    }
  }, [filterAudio, filterTimestamp]);

  const handleSearchSubmit = useCallback(() => {
    if (query.trim().length === 0) return;
    
    setRecentSearches(prev => {
      const newHistory = [query.trim(), ...prev.filter(q => q !== query.trim())];
      return newHistory.slice(0, 8); // Keep only last 8
    });
  }, [query]);

  const handleRecentSearchPress = useCallback((searchText: string) => {
    handleSearch(searchText);
  }, [handleSearch]);

  const handleSongPress = useCallback((song: Song) => {
    // Also add to history on selection
    setRecentSearches(prev => {
      const newHistory = [song.title, ...prev.filter(q => q !== song.title)];
      return newHistory.slice(0, 8);
    });

    const isCurrentlyPlaying = playerCurrentSong?.id === song.id;

    if (playInMiniPlayerOnly) {
      if (isCurrentlyPlaying) {
        // Second tap: Open NowPlayingScreen
        setMiniPlayerHidden(true);
        navigation.navigate('NowPlaying', { songId: song.id });
      } else {
        // First tap: Play in mini player
        setCurrentSong(song);
        usePlayerStore.getState().setInitialSong(song);
        usePlayerStore.getState().loadSong(song.id); // Fetch full lyrics immediately
      }
    } else {
      // Default: Always navigate
      // Default: Always navigate
      setCurrentSong(song);
      setMiniPlayerHidden(true);
      usePlayerStore.getState().setInitialSong(song); // Added setInitialSong for consistency
      usePlayerStore.getState().loadSong(song.id);
      navigation.navigate('NowPlaying', { songId: song.id });
    }
  }, [navigation, setCurrentSong, playInMiniPlayerOnly, playerCurrentSong?.id]);

  const renderResult = ({ item }: { item: Song }) => {
    return (
      <Pressable
        style={styles.resultItem}
        onPress={() => handleSongPress(item)}
      >
        <View style={styles.resultThumbnail}>
          {item.coverImageUri ? (
            <Image 
              source={{ uri: item.coverImageUri }} 
              style={StyleSheet.absoluteFill} 
            />
          ) : (
            <View style={styles.defaultResultThumbnail}>
              <Ionicons name="disc" size={24} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            Song • {item.artist || 'Unknown Artist'}
          </Text>
        </View>
        
        {/* Heart Toggle */}
        <Pressable 
          onPress={(e) => {
            e.stopPropagation();
            toggleLike(item.id);
          }}
          style={({ pressed }) => [
            styles.heartGlow,
            pressed && { transform: [{ scale: 1.2 }] },
            {
              shadowColor: getGradientById(item.gradientId)?.colors[1] || '#fff',
              shadowOpacity: item.isLiked ? 0.8 : 0.3,
              shadowRadius: item.isLiked ? 8 : 2,
              elevation: item.isLiked ? 5 : 1,
            }
          ]}
          hitSlop={10}
        >
          <Ionicons 
            name={item.isLiked ? "heart" : "heart-outline"} 
            size={22} 
            color={item.isLiked ? "#fff" : "rgba(255,255,255,0.6)"} 
          />
        </Pressable>

        <Ionicons name="play" size={20} color={Colors.textSecondary} />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Search Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search songs, albums, artists"
              placeholderTextColor={Colors.textSecondary}
              value={query}
              onChangeText={handleSearch}
              onSubmitEditing={handleSearchSubmit}
              autoFocus
            />
            {query.length > 0 && (
              <Pressable onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter Chips */}
        {query.length > 0 && (
          <View style={styles.filterChips}>
            <Pressable 
              style={[styles.chip, filterAudio === 'audio' && styles.chipActive]}
              onPress={() => setFilterAudio(filterAudio === 'audio' ? 'all' : 'audio')}
            >
              <Ionicons name="musical-note" size={16} color={filterAudio === 'audio' ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.chipText, filterAudio === 'audio' && styles.chipTextActive]}>Audio</Text>
            </Pressable>
            <Pressable 
              style={[styles.chip, filterAudio === 'no-audio' && styles.chipActive]}
              onPress={() => setFilterAudio(filterAudio === 'no-audio' ? 'all' : 'no-audio')}
            >
              <Ionicons name="musical-note-outline" size={16} color={filterAudio === 'no-audio' ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.chipText, filterAudio === 'no-audio' && styles.chipTextActive]}>No Audio</Text>
            </Pressable>
            <Pressable 
              style={[styles.chip, filterTimestamp === 'timestamp' && styles.chipActive]}
              onPress={() => setFilterTimestamp(filterTimestamp === 'timestamp' ? 'all' : 'timestamp')}
            >
              <Ionicons name="time" size={16} color={filterTimestamp === 'timestamp' ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.chipText, filterTimestamp === 'timestamp' && styles.chipTextActive]}>Timestamped</Text>
            </Pressable>
            <Pressable 
              style={[styles.chip, filterTimestamp === 'no-timestamp' && styles.chipActive]}
              onPress={() => setFilterTimestamp(filterTimestamp === 'no-timestamp' ? 'all' : 'no-timestamp')}
            >
              <Ionicons name="time-outline" size={16} color={filterTimestamp === 'no-timestamp' ? '#fff' : Colors.textSecondary} />
              <Text style={[styles.chipText, filterTimestamp === 'no-timestamp' && styles.chipTextActive]}>No Timestamp</Text>
            </Pressable>
          </View>
        )}

        {/* Content Area */}
        {query.length === 0 ? (
          // Recent Searches View
          <ScrollView contentContainerStyle={styles.recentSearchesContainer}>
            {recentSearches.length > 0 && (
              <Text style={styles.sectionTitle}>Recent Searches</Text>
            )}
            {recentSearches.map((item, index) => (
              <Pressable
                key={index}
                style={styles.recentItem}
                onPress={() => handleRecentSearchPress(item)}
              >
                <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.recentText}>{item}</Text>
                <Ionicons name="arrow-up-outline" size={16} color={Colors.textSecondary} style={{ transform: [{ rotate: '-45deg' }] }} />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          // Search Results View
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderResult}
            contentContainerStyle={styles.resultsContent}
            ListEmptyComponent={
              <View style={styles.emptyResults}>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33,33,33,0.8)',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  recentSearchesContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  recentText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    marginLeft: 12,
  },
  resultsContent: {
    paddingBottom: 100,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  resultThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2C2C2E',
  },
  defaultResultThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyResults: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  heartGlow: {
    padding: 8,
    marginRight: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

export default SearchScreen;

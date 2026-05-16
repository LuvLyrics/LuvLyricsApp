/**
 * Luvs Screen - Full-screen immersive TikTok/Instagram-style feed
 * No nav bar, back button only, full-screen height
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Pressable,
  Text,
  StatusBar,
  Share,
  ActivityIndicator,
  ViewToken,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useDerivedValue 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLuvsFeedStore } from '../store/luvsFeedStore';
import { luvsBufferManager } from '../services/LuvsBufferManager';
import { LuvCard } from '../components/LuvCard';
import { luvsRecommendationEngine } from '../services/LuvsRecommendationEngine';
import { useLuvsPreferencesStore } from '../store/luvsPreferencesStore';
import { UnifiedSong } from '../types/song';
import { LuvsVaultModal } from '../components/LuvsVaultModal';
import { PerformanceHUD } from '../components/PerformanceHUD';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Full screen - no tab bar deduction
const LUV_HEIGHT = SCREEN_HEIGHT;

const LuvsScreen: React.FC = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const {
    feedSongs,
    currentIndex,
    vault,
    isLoading,
    setFeedSongs,
    appendFeedSongs,
    setCurrentIndex,
    addToVault,
    removeFromVault,
    isInVault,
    setIsLoading,
  } = useLuvsFeedStore();
  
  const insets = useSafeAreaInsets();

  const viewTrackingRef = useRef(-1);
  const flatListRef = useRef<FlatList>(null);
  const [showVault, setShowVault] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false); // Start paused by default
  const viewStartTimeRef = useRef<number>(Date.now());

  const { recordInteraction, loadFromStorage } = useLuvsPreferencesStore();

  const scrollY = useSharedValue(0);
  const currentIndexSV = useDerivedValue(() => {
    'worklet';
    return scrollY.value / LUV_HEIGHT;
  });

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
  });

  // Restore scroll position when screen becomes focused
  useFocusEffect(
    useCallback(() => {
      // Hide status bar for immersive experience
      StatusBar.setHidden(true);

      if (feedSongs.length > 0 && currentIndex > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: currentIndex,
            animated: false,
          });
        }, 100);
      }

      return () => {
        // Show status bar when leaving
        StatusBar.setHidden(false);
        // FORCE STOP ALL LUV AUDIO
        setIsPlaying(false);
        luvsBufferManager.stopAll();
      };
    }, [currentIndex, feedSongs.length])
  );

  // Load initial feed using recommendation engine
  const loadInitialFeed = useCallback(async () => {
    if (feedSongs.length > 0) return; // Already loaded via prefetch
    await luvsRecommendationEngine.refreshRecommendation();
  }, [feedSongs.length]);

  // Reload Feed Button Logic
  const handleReload = async () => {
    if (__DEV__) console.log('[Luvs] 🔄 Reloading feed...');
    setIsPlaying(false);
    await luvsBufferManager.stopAll(); // Stop audio first
    await luvsRecommendationEngine.refreshRecommendation();
    setIsPlaying(true); // Auto-play after reload
  };

  // Initialize: Load preferences and enter reels mode
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Load saved preferences
      await loadFromStorage();
      
      // Engine now auto-seeds from song library on first query
      await luvsBufferManager.enterLuvsMode();

      if (feedSongs.length === 0 && mounted) {
        await loadInitialFeed();
      }
    };

    init();

    return () => {
      mounted = false;
      luvsBufferManager.exitLuvsMode();
    };
  }, [loadFromStorage, loadInitialFeed]); 

  // Ensure we start playing when screen is focused
  useEffect(() => {
    if (isFocused) {
      setIsPlaying(true);
    }
  }, [isFocused]);

  useEffect(() => {
    luvsBufferManager.setSuspended(!isFocused);
    
    if (isFocused && feedSongs.length > 0) {
      // If we are coming BACK to the screen, we might want to respect autoPlay
      // But usually isPlaying state is what we want to maintain during a session.
      if (isPlaying) {
        luvsBufferManager.resume();
      }
    } else if (!isFocused) {
      luvsBufferManager.pause();
    }
  }, [isFocused, feedSongs.length > 0]);

  // Load more songs using recommendation engine
  const loadMoreSongs = useCallback(async () => {
    if (isLoading) return;
    await luvsRecommendationEngine.loadMoreSongs();
  }, [isLoading]);

  // Handle viewable items change + track interactions
  const handleViewableChange = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems || viewableItems.length === 0) return;

      const newIndex = viewableItems[0]?.index;
      if (newIndex != null && newIndex !== viewTrackingRef.current) {
        // Record interaction for PREVIOUS song
        const prevIndex = viewTrackingRef.current;
        const prevSong = feedSongs[prevIndex];
        if (prevSong) {
          const watchDuration = (Date.now() - viewStartTimeRef.current) / 1000;
          const skipped = watchDuration < 3; // < 3 seconds = skip
          
          recordInteraction({
            songId: prevSong.id,
            title: prevSong.title,
            artist: prevSong.artist || 'Unknown',
            timestamp: Date.now(),
            watchDuration,
            totalDuration: prevSong.duration || 180,
            liked: isInVault(prevSong.id),
            skipped,
          });

          if (skipped) {
            if (__DEV__) console.log(`[Luvs] ⏭️ Skipped: ${prevSong.title} (${watchDuration.toFixed(1)}s)`);
          } else {
            if (__DEV__) console.log(`[Luvs] 👀 Watched: ${prevSong.title} for ${watchDuration.toFixed(1)}s`);
          }
        }

        // Reset timer for new song
        viewStartTimeRef.current = Date.now();
        viewTrackingRef.current = newIndex;
        // ALWAYS FORCE PLAY ON SWIPE
        setIsPlaying(true); 
        luvsBufferManager.updateActiveIndex(newIndex, feedSongs, true);

        if (newIndex >= feedSongs.length - 2) {
          loadMoreSongs();
        }
      }
    },
    [feedSongs, isInVault, recordInteraction, loadMoreSongs, setCurrentIndex]
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleLikePress = useCallback((song: UnifiedSong) => {
    if (isInVault(song.id)) {
      removeFromVault(song.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      addToVault(song);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isInVault, addToVault, removeFromVault]);

  const handleSharePress = useCallback(async (song: UnifiedSong) => {
    try {
      await Share.share({
        message: `🎵 Check out "${song.title}" by ${song.artist || 'Unknown Artist'}!`,
      });
    } catch {
      if (__DEV__) console.log('Share cancelled');
    }
  }, []);

  const handleDownloadPress = useCallback((song: UnifiedSong) => {
    // Also toggle vault status since "Save" is currently linked to Vault
    handleLikePress(song);
  }, [handleLikePress]);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await luvsBufferManager.pause();
      setIsPlaying(false);
    } else {
      await luvsBufferManager.resume();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedSong; index: number }) => {
      const isActive = index === currentIndex;
      const isNearActive = Math.abs(index - currentIndex) <= 1;
      return (
        <LuvCard
          song={item}
          isActive={isActive}
          isNearActive={isNearActive}
          isLiked={isInVault(item.id)}
          isPlaying={isActive && isPlaying}
          onLike={() => handleLikePress(item)}
          onShare={() => handleSharePress(item)}
          onDownload={() => handleDownloadPress(item)}
          onPlayPause={handlePlayPause}
          luvHeight={LUV_HEIGHT}
          index={index}
          currentIndex={currentIndexSV}
        />
      );
    },
    [currentIndex, isPlaying, isInVault, handleLikePress, handleSharePress, handleDownloadPress, handlePlayPause, currentIndexSV]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: LUV_HEIGHT,
      offset: LUV_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View style={styles.container}>
      {feedSongs.length > 0 ? (
        <Animated.FlatList
          ref={flatListRef as any}
          data={feedSongs}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          snapToInterval={LUV_HEIGHT}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          windowSize={2}
          maxToRenderPerBatch={1}
          removeClippedSubviews={true}
          initialNumToRender={1}
          updateCellsBatchingPeriod={100}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={handleViewableChange}
          getItemLayout={getItemLayout}
          extraData={vault} 
          onScrollToIndexFailed={(info) => {
            if (__DEV__) console.warn('[Luvs] Scroll to index failed:', info.index);
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                 index: Math.min(info.index, feedSongs.length - 1),
                 animated: false,
              });
            }, 100);
          }}
        />
      ) : (
        !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={80} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No luvs available</Text>
            <Text style={styles.emptySubtext}>
              Pull down to refresh or check your connection
            </Text>
          </View>
        )
      )}

      {/* Back Button - Top Left */}
      <Pressable style={[styles.backButton, { top: insets.top + 16 }]} onPress={handleGoBack}>
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </Pressable>

      {/* Vault Button - Top Right */}
      <Pressable
        style={[styles.vaultButton, { top: insets.top + 16 }]}
        onPress={() => setShowVault(true)}
      >
        <MaterialCommunityIcons name="heart-multiple" size={22} color="#fff" />
        {vault.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{vault.length}</Text>
          </View>
        )}
      </Pressable>

      {/* Reload Button - Top Right (Below Vault) */}
      <Pressable
        style={[styles.reloadButton, { top: insets.top + 16 }]}
        onPress={handleReload}
      >
        <Ionicons name="refresh" size={24} color="#fff" />
      </Pressable>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.loadingText}>  Loading...</Text>
        </View>
      )}

      {/* Luvs Vault Modal */}
      <LuvsVaultModal visible={showVault} onClose={() => setShowVault(false)} />

      {/* Performance HUD (Dev only) */}
      <PerformanceHUD />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  vaultButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  reloadButton: {
    position: 'absolute',
    right: 70, // Positioned to the left of the vault button (or alone if vault is empty)
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF2D55',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default LuvsScreen;

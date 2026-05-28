import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import * as GestureHandler from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackScreenProps } from '../types/navigation';
import { usePlayerStore } from '../store/playerStore';
import { positionSV, durationSV } from '../playback/positionBus';
import { CoverArtSearchScreen } from './CoverArtSearchScreen';
import { useNowPlayingLogic } from '../hooks/useNowPlayingLogic';
import NowPlayingBackground from '../components/NowPlayingBackground';
import NowPlayingHeader from '../components/NowPlayingHeader';
import NowPlayingLyricsArea from '../components/NowPlayingLyricsArea';
import NowPlayingControls from '../components/NowPlayingControls';
import { useThemeColors, useIsDark } from '../contexts/ThemeContext';

const { GestureDetector } = GestureHandler;

type Props = RootStackScreenProps<'NowPlaying'>;

const NowPlayingScreen: React.FC<Props> = ({ navigation, route }) => {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const { songId } = route.params;
  const setMiniPlayerHiddenSource = usePlayerStore(state => state.setMiniPlayerHiddenSource);

  useFocusEffect(
    React.useCallback(() => {
      setMiniPlayerHiddenSource('NowPlaying', true);
      return () => {
        setMiniPlayerHiddenSource('NowPlaying', false);
      };
    }, [setMiniPlayerHiddenSource])
  );

  const {
    currentSong,
    isCurrentSongLiked,
    menuVisible,
    setMenuVisible,
    menuAnchor,
    handleMenuPress,
    showCoverSearch,
    setShowCoverSearch,
    controlsVisible,
    animatedStyle,
    showLyrics,
    setShowLyrics,
    panGesture,
    blob1Style,
    blob2Style,
    blob3Style,
    processedLyrics,
    isLinear,
    flatListRef,
    getActiveLyricIndex,
    playButtonStyle,
    togglePlay,
    skipForward,
    skipBackward,
    handleScrub,
    handleLyricTap,
    gradientColors,
    isDynamicTheme,
    updateCurrentSong,
    addRecentArt,
    autoHideControls,
    setAutoHideControls,
    animateBackground,
    setAnimateBackground,
    storePlaying,
    toggleLike,
    isUserScrolling,
    scrollTimeoutRef,
  } = useNowPlayingLogic(songId);

  const menuOptions = React.useMemo(() => [
    {
      label: showLyrics ? 'Hide Lyrics' : 'Show Lyrics',
      icon: showLyrics ? 'eye-off-outline' : 'eye-outline',
      onPress: () => {
        setMenuVisible(false);
        setShowLyrics(!showLyrics);
      }
    },
    {
      label: 'Go to Current Lyric',
      icon: 'locate-outline',
      onPress: () => {
        setMenuVisible(false);
        const activeLyricIndex = getActiveLyricIndex();
        if (flatListRef.current && activeLyricIndex !== -1 && !isLinear) {
          flatListRef.current.scrollToIndex({
            index: activeLyricIndex,
            animated: true,
            viewPosition: 0.3,
          });
        }
      }
    },
    {
      label: 'Edit Lyrics',
      icon: 'create-outline',
      onPress: () => {
        setMenuVisible(false);
        navigation.navigate('AddEditLyrics', { songId: currentSong?.id });
      }
    },
    {
      label: 'Sync Lyrics',
      icon: 'timer-outline',
      onPress: () => {
        setMenuVisible(false);
        navigation.navigate('AddEditLyrics', { songId: currentSong?.id });
      }
    },
    {
      label: autoHideControls ? 'Disable Auto-Hide' : 'Enable Auto-Hide',
      icon: autoHideControls ? 'eye-outline' : 'eye-off-outline',
      onPress: () => {
        setMenuVisible(false);
        setAutoHideControls(!autoHideControls);
      }
    },
    {
      label: animateBackground ? 'Disable Animation' : 'Enable Animation',
      icon: animateBackground ? 'contrast-outline' : 'contrast',
      onPress: () => {
        setMenuVisible(false);
        setAnimateBackground(!animateBackground);
      }
    }
  ], [showLyrics, setShowLyrics, getActiveLyricIndex, isLinear, currentSong?.id, autoHideControls, setAutoHideControls, animateBackground, setAnimateBackground, flatListRef, setMenuVisible, navigation]);

  const handleCoverSelect = useCallback(async (uri: string) => {
    setShowCoverSearch(false);
    if (currentSong) {
      const updatedSong = { ...currentSong, coverImageUri: uri };
      updateCurrentSong({ coverImageUri: uri });
      try {
        const queries = await import('../database/queries');
        await queries.updateSong(updatedSong);
        addRecentArt(uri);
      } catch (e) {
        if (__DEV__) console.error('[NowPlaying] Failed to save cover:', e);
      }
    }
  }, [currentSong, updateCurrentSong, addRecentArt, setShowCoverSearch]);

      {/* Issue 4: Dynamic Island Bottom Controls */}
      <Animated.View style={[styles.bottomControlsContainer, animatedStyle]} pointerEvents={controlsVisible ? 'auto' : 'none'}>
          {/* 3-Layer Background Stack (Dynamic Island Style) - Replaced with Real BlurView */}
          <View style={[styles.bottomControlsPill, { backgroundColor: '#181818' }]}>

             
             {/* Dynamic Island Body - Blurred Album Art Color */}
             {currentSong?.coverImageUri && (
                <Image 
                  source={{ uri: currentSong.coverImageUri }} 
                  style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} 
                  blurRadius={50}
                />
             )}

             {/* Dark Gradient Overlay for readability & depth */}
             <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              style={StyleSheet.absoluteFill}
             />
            
          {/* Content */}
             {/* Content */}
             <View style={styles.bottomControlsContent}>
               
               {/* 0. Top Right Menu (Three Dots) - Absolute Positioned */}
               <View style={{ position: 'absolute', top: 15, right: 20, zIndex: 10 }}>
                  <Pressable onPress={() => setShowLyrics(!showLyrics)} style={{ padding: 4 }}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="rgba(255,255,255,0.6)" />
                  </Pressable>
               </View>

               {/* 1. Main Controls - Top */}
               <View style={styles.controls}>
                  <Pressable onPress={skipBackward} style={styles.controlBtn}>
                    <Ionicons name="play-back" size={24} color="#fff" /> 
                  </Pressable>
                  
                  <Pressable onPress={togglePlay} style={styles.playBtnLarge}>
                    <Animated.View style={playButtonStyle}>
                         <Ionicons 
                          name={storePlaying ? 'pause' : 'play'} 
                          size={32} 
                          color="#000" 
                        />
                    </Animated.View>
                  </Pressable>
                  
                  <Pressable onPress={skipForward} style={styles.controlBtn}>
                    <Ionicons name="play-forward" size={24} color="#fff" /> 
                  </Pressable>
               </View>

               {/* 2. Scrubber - Middle */}
               <View style={{ marginVertical: 8 }}> 
                  <TimelineScrubber
                     currentTime={positionSV}
                     duration={durationSV}
                     onSeek={handleScrub}
                     variant="classic"
                  />
               </View>

               {/* 3. Mini Info (Title + Artist) - Bottom & Centered (No Cover) */}
                <View style={[styles.miniInfo, { paddingHorizontal: 40 }]}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
                       <View style={{ flex: 1, alignItems: 'center' }}>
                           <Text style={styles.miniTitle} numberOfLines={1}>{currentSong?.title}</Text>
                           <Text style={styles.miniArtist} numberOfLines={1}>{currentSong?.artist}</Text>
                       </View>
                       
                       <Pressable 
                         onPress={() => currentSong && toggleLike(currentSong.id)}
                         style={({ pressed }) => [
                           { position: 'absolute', right: -25 },
                           pressed && { transform: [{ scale: 1.4 }] }
                         ]}
                         hitSlop={15}
                       >
                           <Ionicons 
                             name={currentSong?.isLiked ? "heart" : "heart-outline"} 
                             size={30} 
                             color="#fff"
                           />
                       </Pressable>
                   </View>
                </View>
             </View>
          </View>
      </Animated.View>
    </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentArea: {
    flex: 1,
  },
});

export default NowPlayingScreen;

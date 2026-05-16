/**
 * Luv Card Component
 * Instagram Reels-inspired layout with right-side buttons and bottom song info
 * Dynamic blurred background from cover art
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolation,
  SharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UnifiedSong } from '../types/song';
import { analyzeImageBrightness } from '../utils/imageAnalyzer';

import { luvsBufferManager } from '../services/LuvsBufferManager';
import TimelineScrubber from './TimelineScrubber';
import { luvsRecommendationEngine } from '../services/LuvsRecommendationEngine';

// Local component to handle progress updates without re-rendering the heavy LuvCard
const LuvsProgressController = ({ isActive }: { isActive: boolean }) => {
  const position = useSharedValue(0);
  const duration = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Subscribe to updates
      luvsBufferManager.setStatusUpdateCallback((status) => {
        if (status.isLoaded) {
          position.value = status.positionMillis;
          duration.value = status.durationMillis || 0;
        }
      });
    }
  }, [isActive, position, duration]);

  if (!isActive) return null;

  return (
    <View style={styles.scrubberContainer}>
        <TimelineScrubber 
            currentTime={position}
            duration={duration}
            onSeek={(time) => luvsBufferManager.seekTo(time)}
            onScrubStart={() => luvsBufferManager.pause()}
            onScrubEnd={() => luvsBufferManager.resume()}
            variant="island"
        />
    </View>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LuvCardProps {
  song: UnifiedSong;
  isActive: boolean;
  isLiked: boolean;
  isPlaying: boolean;
  onLike: () => void;
  onShare: () => void;
  onDownload: () => void;
  onPlayPause: () => void;
  luvHeight: number;
  index: number;
  currentIndex: SharedValue<number>;
  isNearActive: boolean;
}

export const LuvCard = React.memo<LuvCardProps>(({ 
    song, 
    isActive, 
    isLiked, 
    isPlaying, 
    onLike, 
    onShare, 
    onDownload, 
    onPlayPause, 
    luvHeight,
    index,
    currentIndex,
    isNearActive
  }) => {
    const [showPlayPause, setShowPlayPause] = useState(false);
    const [gradientOpacity, setGradientOpacity] = useState(0.85);
    const insets = useSafeAreaInsets();
    const [isMagicActive, setIsMagicActive] = useState(false);

    useEffect(() => {
      if (isActive && song.highResArt) {
        analyzeImageBrightness(song.highResArt).then(result => {
           // If light, more opacity for legibility
           setGradientOpacity(result.brightness > 160 ? 0.95 : 0.85);
        });
      }
    }, [song.highResArt, isActive]);

    const handleTap = () => {
      onPlayPause();
      setShowPlayPause(true);
      setTimeout(() => setShowPlayPause(false), 800);
    };

    const handleLikePress = useCallback(() => {
      onLike();
    }, [onLike]);

    const handleMagicPress = useCallback(() => {
      setIsMagicActive(true);
      luvsRecommendationEngine.discoverSimilar(song.id);
      
      // Reset after a while
      magicTimeoutRef.current = setTimeout(() => {
        setIsMagicActive(false);
      }, 3000);
    }, [song.id]);

    // Cleanup magic timeout on unmount
    const magicTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
      return () => {
        if (magicTimeoutRef.current) clearTimeout(magicTimeoutRef.current);
      };
    }, []);

    // Card visibility and entry/exit transformation
    const cardAnimatedStyle = useAnimatedStyle(() => {
      'worklet';
      const distance = Math.abs(currentIndex.value - index);
      
      // Early exit for far-away cards
      if (distance > 1.1) {
        return { opacity: 0, transform: [{ scale: 0.9 }, { translateY: 0 }] } as ViewStyle;
      }

      const scale = interpolate(
        distance,
        [0, 1],
        [1, 0.9],
        Extrapolation.CLAMP
      );

      const translateY = interpolate(
        currentIndex.value - index,
        [-1, 0, 1],
        [40, 0, -40],
        Extrapolation.CLAMP
      );

      const opacity = interpolate(
        distance,
        [0, 0.5, 1],
        [1, 0.9, 0],
        Extrapolation.CLAMP
      );

      return {
        opacity,
        transform: [
          { scale },
          { translateY }
        ]
      } as ViewStyle;
    });

    return (
      <Animated.View 
        style={[styles.container, { height: luvHeight }, cardAnimatedStyle]}
        renderToHardwareTextureAndroid={true}
      >
        <Pressable style={[StyleSheet.absoluteFill, styles.centeredContent]} onPress={handleTap}>
          {/* Blurred Background - Only show blur if near active */}
          {song.highResArt && (
            <Image
              source={{ uri: song.highResArt }}
              style={[
                StyleSheet.absoluteFillObject, 
                { width: SCREEN_WIDTH, height: luvHeight, opacity: isActive ? 1 : 0.6 }
              ]}
              blurRadius={isActive ? 40 : 0}
              resizeMode="cover"
            />
          )}

          {/* Dark Overlay */}
          <View style={styles.overlay} />

          {/* Main Cover Art - Centered */}
          {song.highResArt && (
            <Image
              source={{ uri: song.highResArt }}
              style={styles.coverArt}
              resizeMode="cover"
            />
          )}

          {/* Play/Pause indicator (shows briefly on tap) */}
          {showPlayPause && (
            <View style={styles.playPauseOverlay}>
              <View style={styles.playPauseCircle}>
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={50}
                  color="#fff"
                />
              </View>
            </View>
          )}

          {/* UI overlay: always mounted, visibility driven by opacity for smooth transitions */}
          <Animated.View 
            style={[StyleSheet.absoluteFill, isNearActive ? styles.uiVisible : styles.uiHidden]}
            pointerEvents={isNearActive ? 'auto' : 'none'}
          >
              {/* PROGRESS SCRUBBER */}
              <View style={styles.progressWrapper}>
                  <LuvsProgressController isActive={isActive} />
              </View>

              {/* Right Side Action Buttons */}
              <View style={[styles.actionsContainer, { bottom: insets.bottom + 120 }]}>
                {/* Luv Button */}
                <View>
                  <Pressable style={styles.actionButton} onPress={handleLikePress}>
                    <Ionicons
                      name={isLiked ? 'heart' : 'heart-outline'}
                      size={32}
                      color={isLiked ? '#FF2D55' : '#fff'}
                    />
                    <Text style={[styles.actionLabel, isLiked && styles.likedLabel]}>
                      {isLiked ? "Luv'd" : 'Luv'}
                    </Text>
                  </Pressable>
                </View>

                {/* Magic Button (Discover More) */}
                <View>
                  <Pressable 
                    style={styles.actionButton} 
                    onPress={handleMagicPress}
                    disabled={isMagicActive}
                  >
                    <Ionicons
                      name="sparkles"
                      size={30}
                      color={isMagicActive ? '#4CD964' : '#fff'}
                    />
                    <Text style={[styles.actionLabel, isMagicActive && styles.magicLabel]}>
                      {isMagicActive ? 'Learning...' : 'Magic'}
                    </Text>
                  </Pressable>
                </View>

                {/* Share Button */}
                <Pressable style={styles.actionButton} onPress={onShare}>
                  <Ionicons name="share-outline" size={30} color="#fff" />
                  <Text style={styles.actionLabel}>Share</Text>
                </Pressable>

                {/* Download Button */}
                <Pressable style={styles.actionButton} onPress={onDownload}>
                  <Ionicons name="download-outline" size={30} color="#fff" />
                  <Text style={styles.actionLabel}>Save</Text>
                </Pressable>
              </View>

              {/* Bottom Song Info Bar */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', `rgba(0,0,0,${gradientOpacity})`]}
                style={[styles.bottomGradient, { paddingBottom: insets.bottom + 16 }]}
              >
                <View style={styles.songInfoRow}>
                  {/* Mini Album Art */}
                  {song.highResArt ? (
                    <Image source={{ uri: song.highResArt }} style={styles.miniArt} />
                  ) : (
                    <View style={styles.placeholderArt}>
                      <Ionicons name="musical-note" size={18} color="#fff" />
                    </View>
                  )}

                  {/* Song Details */}
                  <View style={styles.songDetails}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {song.artist || 'Unknown Artist'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
          </Animated.View>
        </Pressable>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.isActive === nextProps.isActive &&
      prevProps.isNearActive === nextProps.isNearActive &&
      prevProps.isLiked === nextProps.isLiked &&
      prevProps.isPlaying === nextProps.isPlaying &&
      prevProps.song.id === nextProps.song.id
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  uiVisible: {
    opacity: 1,
  },
  uiHidden: {
    opacity: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  centeredContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverArt: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginTop: -80, // Moved it "lil top"
    marginLeft: -30, // "slightly left side"
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  playPauseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrapper: {
    position: 'absolute',
    bottom: 120, // Above song info
    left: 20,
    right: 20, // Full width minus margins
    height: 40,
    justifyContent: 'center',
    zIndex: 20,
  },
  scrubberContainer: {
    width: '100%',
  },
  actionsContainer: {
    position: 'absolute',
    right: 12,
    gap: 20,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  likedLabel: {
    color: '#FF2D55',
  },
  magicLabel: {
    color: '#4CD964',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 60, // Gradient fade distance
  },
  songInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', // Glassmorphism touch
    borderRadius: 14,
    padding: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  miniArt: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderArt: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songDetails: {
    flex: 1,
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  songArtist: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

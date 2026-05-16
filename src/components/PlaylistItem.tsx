import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate, Easing, cancelAnimation, SharedValue } from 'react-native-reanimated';
import { RenderItemParams } from 'react-native-draggable-flatlist';
import { Song } from '../types/song';
import { useLyricsScanQueueStore } from '../store/lyricsScanQueueStore';
import { Colors } from '../constants/colors';

interface PlaylistItemProps extends Partial<RenderItemParams<Song>> {
  item: Song;
  currentSongId: string | null;
  isEditMode: boolean;
  onPress: (song: Song, index: number) => void;
  onMagicPress?: (song: Song) => void;
  onDelete: (songId: string) => void;
  isPlaying: boolean;
  displayIndex: number;
}

// ... imports

const VisualizerBar = ({ anim }: { anim: SharedValue<number> }) => {
// ... existing VisualizerBar code remains same ...
    const style = useAnimatedStyle(() => ({
        height: interpolate(anim.value, [0, 1], [4, 14]),
        opacity: interpolate(anim.value, [0, 1], [0.5, 1])
    }));
    return <Animated.View style={[styles.visualizerBar, style]} />;
};

const LiveVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
// ... existing LiveVisualizer code remains same ...
    const sv1 = useSharedValue(0.3);
    const sv2 = useSharedValue(0.4);
    const sv3 = useSharedValue(0.3);

    const animations = React.useMemo(() => [sv1, sv2, sv3], [sv1, sv2, sv3]);
    
    React.useEffect(() => {
        if (!isPlaying) {
            animations.forEach(anim => {
                cancelAnimation(anim);
                anim.value = withTiming(0.3, { duration: 300 });
            });
            return;
        }

        animations.forEach((anim, i) => {
            const delay = i * 50;
            setTimeout(() => {
                anim.value = withRepeat(
                    withSequence(
                        withTiming(Math.random(), { duration: 150, easing: Easing.linear }),
                        withTiming(Math.random(), { duration: 100, easing: Easing.quad }),
                        withTiming(Math.random(), { duration: 250, easing: Easing.inOut(Easing.quad) }),
                        withTiming(Math.random(), { duration: 120, easing: Easing.linear })
                    ),
                    -1,
                    true
                );
            }, delay);
        });
        
        return () => {
             animations.forEach(anim => cancelAnimation(anim));
        };
    }, [isPlaying, animations]);

    return (
        <View style={styles.visualizerContainer}>
            {animations.map((anim, i) => (
                <VisualizerBar key={i} anim={anim} />
            ))}
        </View>
    );
};

const PlaylistItemComponent: React.FC<PlaylistItemProps> = ({ 
  item, 
  drag, 
  isActive, 
  currentSongId, 
  isEditMode, 
  onPress,
  onMagicPress,
  onDelete,
  isPlaying,
  displayIndex
}) => {
  const isActiveSong = currentSongId === item.id;
  // console.log("PlaylistItem rendered", item.id); // Debug Log
  
  // Internal Subscription
  const scanJob = useLyricsScanQueueStore(state => state.queue[item.id]);
  const isScanning = scanJob?.status === 'scanning' || scanJob?.status === 'pending';
  const isCompleted = scanJob?.status === 'completed';
  
  // Triple Tap Logic
  const tapCountRef = React.useRef(0);
  const lastTapRef = React.useRef(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handlePress = () => {
    if (isEditMode) return; // Don't trigger play/magic in edit mode

    const now = Date.now();
    const delay = 400;

    if (now - lastTapRef.current < delay) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapRef.current = now;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (tapCountRef.current === 3) {
      // Triple Tap Trigger
      if (onMagicPress) onMagicPress(item);
      tapCountRef.current = 0;
    } else {
      timerRef.current = setTimeout(() => {
        if (tapCountRef.current === 1) {
          onPress(item, displayIndex);
        }
        tapCountRef.current = 0;
      }, delay);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Pressable
        onLongPress={isEditMode ? drag : undefined}
        onPress={handlePress}
        disabled={isActive}
        style={[
          styles.songRow,
          isActiveSong && !isEditMode && styles.songRowActive,
          isActive && styles.songRowDragging
        ]}
      >
        {/* Left Side: Number or Drag Handle */}
        <View style={styles.leftAction}>
           {isEditMode ? (
             <Pressable onPressIn={drag} hitSlop={20}>
               <Ionicons name="reorder-two" size={24} color="#666" />
             </Pressable>
           ) : (
              <Text style={styles.songNumber}>
                {displayIndex + 1}
              </Text>
           )}
        </View>

        {/* Album Art (Small) */}
        <View style={styles.smallCoverContainer}>
          {item.coverImageUri ? (
            <Image 
                source={{ uri: item.coverImageUri }} 
                style={styles.smallCover} 
                contentFit="cover"
                cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.smallCover, styles.placeholderCover]}>
              <Ionicons name="musical-note" size={20} color="#666" />
            </View>
          )}

          {/* Scanning Overlay */}
          {isScanning && (
            <View style={styles.scanningOverlay}>
               <Ionicons name="sync" size={16} color="#FFF" />
            </View>
          )}

          {/* Live Visualizer (White & Animated) */}
          {isActiveSong && !isEditMode && !isScanning && (
              <View style={styles.visualizerOverlay}>
                  <LiveVisualizer isPlaying={isPlaying} />
              </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.songInfo}>
          <View style={styles.titleRow}>
            <Text 
              style={[styles.songTitle, isActiveSong && !isEditMode && styles.songTitleActive]} 
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {(isCompleted || (item.lyrics && item.lyrics.length > 0)) && (
               <Ionicons name="checkmark-circle" size={12} color={Colors.primary} style={styles.checkIcon} />
            )}
          </View>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.artist || 'Unknown Artist'}
          </Text>
        </View>

        {/* Right Side: Duration or Delete */}
        {isEditMode ? (
          <Pressable onPress={() => onDelete(item.id)} hitSlop={10}>
            <Ionicons name="remove-circle" size={24} color="#ff4444" />
          </Pressable>
        ) : (
           <Text style={styles.songDuration}>{formatDuration(item.duration || 0)}</Text>
        )}

        {!isEditMode && (
           <Pressable style={styles.moreButton} hitSlop={10}>
              <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.6)" />
           </Pressable>
        )}

      </Pressable>
  );
};

const styles = StyleSheet.create({
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 76, // FIXED HEIGHT
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  songRowActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  songRowDragging: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    // SHADOWS REMOVED FOR GPU PERFORMANCE - using simple elevation for Android if needed, but keeping it flat is faster
    transform: [{ scale: 1.02 }],
  },
  leftAction: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  songNumber: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  songNumberActive: {
      color: Colors.primary 
  },
  smallCoverContainer: {
    marginRight: 12,
  },
  smallCover: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#333'
  },
  placeholderCover: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scanningOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
      top: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
  },
  visualizerOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
      top: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      borderRadius: 4,
      justifyContent: 'center',
      alignItems: 'center',
  },
  visualizerContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 16,
      gap: 2,
  },
  visualizerBar: {
      width: 3,
      backgroundColor: '#FFF',
      borderRadius: 2,
  },
  songInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  songTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  songTitleActive: {
    color: '#fff',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 4
  },
  songArtist: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  songDuration: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 8,
  },
  songDurationActive: {
      fontSize: 12,
      color: Colors.primary,
      fontWeight: '600',
      marginLeft: 8,
      fontVariant: ['tabular-nums'],
  },
  moreButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export const PlaylistItem = memo(PlaylistItemComponent, (prevProps, nextProps) => {
  // Custom comparison for strict performance
  const idChanged = prevProps.item.id !== nextProps.item.id;
  const activeChanged = prevProps.isActive !== nextProps.isActive;
  const editModeChanged = prevProps.isEditMode !== nextProps.isEditMode;
  const indexChanged = prevProps.displayIndex !== nextProps.displayIndex;
  const currentSongChanged = prevProps.currentSongId !== nextProps.currentSongId;
  const isActiveSong = prevProps.item.id === prevProps.currentSongId || nextProps.item.id === nextProps.currentSongId;
  
  // Rerender if:
  // 1. Different underlying song (id changed)
  // 2. Dragging state changed (isActive)
  // 3. Edit Mode toggled (isEditMode)
  // 4. This specific song STARTED or STOPPED playing (isActiveSong && currentSongChanged)
  
  // Return TRUE if props are equal (DO NOT RERENDER)
  // Return FALSE if props are different (RERENDER)
  
  if (idChanged || activeChanged || editModeChanged || indexChanged) {
      return false; // Rerender
  }
  
  if (currentSongChanged && isActiveSong) {
      return false; // Rerender only if this song is affected
  }

  return true; // Use cached
});

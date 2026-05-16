/**
 * LyricFlow - Song Card Component
 * Grid card for library with gradient thumbnail
 */

import React, { memo } from 'react';
import { StyleSheet, View, Text, Pressable, Image, GestureResponderEvent, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getGradientById, GRADIENTS } from '../constants/gradients';
import { Colors } from '../constants/colors';
import { formatSongSubtitle } from '../utils/formatters';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay, 
  runOnJS, 
  interpolate, 
  Extrapolation 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface SongCardProps {
  id: string;
  title: string;
  artist?: string;
  album?: string;
  gradientId: string;
  coverImageUri?: string;
  duration?: number;
  isLiked?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onLikePress?: () => void;
  onMagicPress?: () => void;
}

export const SongCard: React.FC<SongCardProps> = memo(({
  title,
  artist,
  album,
  gradientId,
  coverImageUri,
  duration,
  isLiked,
  onPress,
  onLongPress,
  onLikePress,
  onMagicPress,
}) => {
  const gradient = getGradientById(gradientId) ?? GRADIENTS[0];
  const glowColor = gradient.colors[1] || gradient.colors[0]; // Use a primary color from gradient for glow
  const subtitle = formatSongSubtitle(artist, album);
  const durationText = duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}` : '';

  // Animation State
  const flipRotation = useSharedValue(0); // 0 to 180
  const cardScale = useSharedValue(1);

  // Tap Handling State
  const lastTapRef = React.useRef<number>(0);
  const tapCountRef = React.useRef<number>(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Flip State
  const [isFlippedState, setIsFlippedState] = React.useState(false);

  // We use a ref for immediate logic access during gesture
  const isFlippedRef = React.useRef(false);

  const toggleFlip = () => {
      const nextState = !isFlippedRef.current;
      isFlippedRef.current = nextState;
      setIsFlippedState(nextState);
      
      flipRotation.value = withTiming(nextState ? 180 : 0, { duration: 500 });
  };

  const handlePressIn = () => {
      cardScale.value = withTiming(0.96, { duration: 100 });
  };

  const handlePressOut = () => {
      cardScale.value = withTiming(1, { duration: 100 });
  };


  const handlePress = () => {
    const now = Date.now();
    const delay = 250; // time to wait for next tap (reduced from 400 for snappiness)

    if (now - lastTapRef.current < delay) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapRef.current = now;

    // Trigger feedback for every tap
    if (cardScale.value === 1) {
        cardScale.value = withSequence(
            withTiming(0.96, { duration: 50 }),
            withTiming(1, { duration: 100 })
        );
    }

    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }

    if (tapCountRef.current === 3) {
        // Triple Tap!
        tapCountRef.current = 0; // Reset
        toggleFlip();
    } else {
        // Wait for next tap
        timerRef.current = setTimeout(() => {
            if (tapCountRef.current === 1) {
                // Single Tap Action
                if (isFlippedRef.current) {
                    // Back Face Tap -> Magic Search
                    if (onMagicPress) onMagicPress();
                    // Auto-flip back to front
                    toggleFlip();
                } else {
                    // Front Face Tap -> Play
                    onPress();
                }
            }
            // Reset count if time elapsed
            tapCountRef.current = 0;
        }, delay);
    }
  };

  // Animated Styles
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = `${interpolate(flipRotation.value, [0, 180], [0, 180])}deg`;
    return {
        transform: [
            { perspective: 1000 },
            { rotateY },
            { scale: cardScale.value }
        ],
        opacity: interpolate(flipRotation.value, [85, 95], [1, 0]),
        zIndex: flipRotation.value < 90 ? 1 : 0,
        backfaceVisibility: 'hidden',
    } as ViewStyle;
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = `${interpolate(flipRotation.value, [0, 180], [180, 360])}deg`;
    return {
        transform: [
            { perspective: 1000 },
            { rotateY },
            { scale: cardScale.value }
        ],
        opacity: interpolate(flipRotation.value, [85, 95], [0, 1]),
        zIndex: flipRotation.value > 90 ? 1 : 0,
        backfaceVisibility: 'hidden',
    } as ViewStyle;
  });

  const sharedAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }]
  }));

  
  // Heart Press Handle
  const handleHeartPress = (e: GestureResponderEvent) => {
      e.stopPropagation(); // Standard React Event stop
      onLikePress?.();
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      delayLongPress={500}
      unstable_pressDelay={70}
    >
        {/* FLIP CONTAINER */}
        <View>
            {/* FRONT FACE THUMBNAIL */}
            <Animated.View style={[styles.face, frontAnimatedStyle]}>
                <View style={styles.thumbnailContainer}>
                    {coverImageUri ? (
                    <Image 
                        source={{ uri: coverImageUri }} 
                        style={styles.thumbnail} 
                    />
                    ) : (
                    <View style={styles.defaultThumbnail}>
                        <Ionicons name="disc" size={48} color="rgba(255,255,255,0.3)" />
                    </View>
                    )}
                    <View style={styles.thumbnailOverlay} />
                    
                    {/* Heart Icon Overlay */}
                    <Pressable 
                    style={({ pressed }) => [
                        styles.heartButton,
                        pressed && { opacity: 0.7 }
                    ]}
                    onPress={handleHeartPress}
                    hitSlop={10}
                    >
                    <View style={[
                        styles.heartGlow,
                        { 
                        shadowColor: glowColor,
                        shadowOpacity: isLiked ? 0.8 : 0.4,
                        shadowRadius: isLiked ? 8 : 2,
                        elevation: isLiked ? 5 : 2,
                        }
                    ]}>
                        <Ionicons 
                        name={isLiked ? "heart" : "heart-outline"} 
                        size={22} 
                        color={isLiked ? "#fff" : "rgba(255,255,255,0.7)"} 
                        />
                    </View>
                    </Pressable>
                </View>
            </Animated.View>

            {/* BACK FACE THUMBNAIL (MAGIC) */}
            <Animated.View style={[styles.face, styles.backFace, backAnimatedStyle]}>
                <View style={[styles.thumbnailContainer, { width: '100%', height: undefined, aspectRatio: 1, backgroundColor: '#000' }]}>
                   {/* Blurred Background Image */}
                   {coverImageUri ? (
                        <Image 
                            source={{ uri: coverImageUri }} 
                            style={StyleSheet.absoluteFill}
                            blurRadius={15}
                        />
                   ) : (
                       <LinearGradient
                          colors={['#333', '#111']}
                          style={StyleSheet.absoluteFill}
                       />
                   )}

                    {/* Overlay for legibility */}
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' }} />

                    {/* Content */}
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="sparkles" size={42} color="#FFF" />
                        <Text style={{ color: '#fff', fontSize: 10, marginTop: 8, fontWeight: '900', letterSpacing: 1 }}>MAGIC LYRICS</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2 }}>TAP TO SEARCH</Text>
                    </View>
                </View>
            </Animated.View>
        </View>

        {/* Song Info - Always Visible */}
        <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
            {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
            </Text>
            {durationText && (
            <Text style={styles.duration}>{durationText}</Text>
            )}
        </View>
    </Pressable>
  );
});

SongCard.displayName = 'SongCard';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  face: {
    backfaceVisibility: 'hidden',
  },
  backFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  thumbnailContainer: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#2C2C2E',
  },
  defaultThumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C2C2E',
  },
  thumbnail: {
    flex: 1,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  info: {
    gap: 2,
    marginTop: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  duration: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  heartButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
  },
  heartGlow: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    padding: 4,
    // Glow effect
    shadowOffset: { width: 0, height: 0 },
  },
});

export default SongCard;

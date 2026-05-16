/**
 * LyricFlow - Player Controls Component
 * Play/Pause and Skip controls for Now Playing screen
 */

import React, { memo } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  SharedValue,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkipPrevious: () => void;
  onSkipNext: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = memo(({
  isPlaying,
  onPlayPause,
  onSkipPrevious,
  onSkipNext,
}) => {
  const playScale = useSharedValue(1);
  const prevScale = useSharedValue(1);
  const nextScale = useSharedValue(1);

  const handlePressIn = (scaleValue: SharedValue<number>) => {
    scaleValue.value = withSpring(0.9);
  };

  const handlePressOut = (scaleValue: SharedValue<number>) => {
    scaleValue.value = withSpring(1);
  };

  const playStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  const prevStyle = useAnimatedStyle(() => ({
    transform: [{ scale: prevScale.value }],
  }));

  const nextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nextScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Skip Backward 10s */}
      <AnimatedPressable
        style={[styles.skipButton, prevStyle]}
        onPress={onSkipPrevious}
        onPressIn={() => handlePressIn(prevScale)}
        onPressOut={() => handlePressOut(prevScale)}
      >
        <View style={styles.skipIconContainer}>
          <Ionicons name="play-back" size={32} color="rgba(255,255,255,0.8)" />
          <Text style={styles.skipText}>10</Text>
        </View>
      </AnimatedPressable>

      {/* Play/Pause */}
      <AnimatedPressable
        style={[styles.playButton, playStyle]}
        onPress={onPlayPause}
        onPressIn={() => handlePressIn(playScale)}
        onPressOut={() => handlePressOut(playScale)}
      >
        <Ionicons
          name={isPlaying ? 'pause-circle' : 'play-circle'}
          size={76}
          color="#fff"
        />
      </AnimatedPressable>

      {/* Skip Forward 10s */}
      <AnimatedPressable
        style={[styles.skipButton, nextStyle]}
        onPress={onSkipNext}
        onPressIn={() => handlePressIn(nextScale)}
        onPressOut={() => handlePressOut(nextScale)}
      >
        <View style={styles.skipIconContainer}>
          <Ionicons name="play-forward" size={32} color="rgba(255,255,255,0.8)" />
          <Text style={styles.skipText}>10</Text>
        </View>
      </AnimatedPressable>
    </View>
  );
});

PlayerControls.displayName = 'PlayerControls';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
    paddingVertical: 8,
  },
  skipButton: {
    padding: 4,
  },
  playButton: {
    // No additional styling needed
  },
  skipIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
});

export default PlayerControls;

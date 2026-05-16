/**
 * LyricFlow - Single Lyric Line Component
 * Styled line with current/previous/upcoming states
 */

import React, { memo } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { useSettingsStore, FONT_SIZE_MAP, LINE_SPACING_MAP } from '../store/settingsStore';

interface LyricsLineProps {
  text: string;
  isActive: boolean;
  isPrevious: boolean;
  distanceFromActive: number; // 0 = active, negative = previous, positive = upcoming
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const LyricsLine: React.FC<LyricsLineProps> = memo(({
  text,
  isActive,
  isPrevious,
  distanceFromActive,
  onPress,
}) => {
  const lyricsFontSize = useSettingsStore(state => state.lyricsFontSize);
  const lineSpacing = useSettingsStore(state => state.lineSpacing);
  const fontSizes = FONT_SIZE_MAP[lyricsFontSize];
  const lineHeight = LINE_SPACING_MAP[lineSpacing];

  const animatedStyle = useAnimatedStyle(() => {
    const scale = withTiming(isActive ? 1.05 : 0.95, { duration: 300 });
    const opacity = withTiming(
      isActive ? 1 : isPrevious ? 0.4 : 0.5 - Math.abs(distanceFromActive) * 0.05,
      { duration: 300 }
    );

    return {
      transform: [{ scale }],
      opacity: Math.max(opacity, 0.2),
    };
  });

  const textStyle = [
    styles.text,
    {
      fontSize: isActive ? fontSizes.current : fontSizes.other,
      lineHeight: (isActive ? fontSizes.current : fontSizes.other) * lineHeight,
      fontWeight: isActive ? '800' as const : '700' as const,
      color: isActive ? Colors.lyricCurrent : isPrevious ? Colors.lyricPrevious : Colors.lyricUpcoming,
      textShadowRadius: isActive ? 10 : 0,
      textShadowColor: isActive ? 'rgba(255,255,255,0.3)' : 'transparent',
    },
  ];

  return (
    <AnimatedPressable
      style={[styles.container, animatedStyle]}
      onPress={onPress}
    >
      <Text style={textStyle}>{text}</Text>
    </AnimatedPressable>
  );
});

LyricsLine.displayName = 'LyricsLine';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  text: {
    textAlign: 'left',
    letterSpacing: -0.5,
  },
});

export default LyricsLine;

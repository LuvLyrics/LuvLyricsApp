import React, { memo } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { useThemeColors } from '../contexts/ThemeContext';
import { useSettingsStore, FONT_SIZE_MAP, LINE_SPACING_MAP } from '../store/settingsStore';

interface LyricsLineProps {
  text: string;
  activeIndexSV: SharedValue<number>;
  index: number;
  onPress?: () => void;
}

export const LyricsLine: React.FC<LyricsLineProps> = memo(({
  text,
  activeIndexSV,
  index,
  onPress,
}) => {
  const colors = useThemeColors();
  const lyricsFontSize = useSettingsStore(state => state.lyricsFontSize);
  const lineSpacing = useSettingsStore(state => state.lineSpacing);
  const fontSizes = FONT_SIZE_MAP[lyricsFontSize];
  const lh = LINE_SPACING_MAP[lineSpacing];

  // Capture primitive values for worklet closure
  const activeFontSize = fontSizes.current;
  const inactiveFontSize = fontSizes.other;
  const activeLineHeight = fontSizes.current * lh;
  const inactiveLineHeight = fontSizes.other * lh;

  // Capture color strings as primitives so worklet can use them
  const colorCurrent = colors.lyricCurrent;
  const colorPrevious = colors.lyricPrevious;
  const colorUpcoming = colors.lyricUpcoming;

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeIndexSV.value === index;
    const isPrevious = activeIndexSV.value > index;
    const dist = Math.abs(activeIndexSV.value - index);
    const targetOpacity = isActive
      ? 1
      : isPrevious
        ? 0.4
        : Math.max(0.5 - dist * 0.05, 0.2);

    return {
      transform: [{ scale: withTiming(isActive ? 1.05 : 0.95, { duration: 300 }) }],
      opacity: withTiming(targetOpacity, { duration: 300 }),
      fontSize: isActive ? activeFontSize : inactiveFontSize,
      lineHeight: isActive ? activeLineHeight : inactiveLineHeight,
      fontWeight: (isActive ? '800' : '700') as '800' | '700',
      color: isActive ? colorCurrent : isPrevious ? colorPrevious : colorUpcoming,
      textShadowRadius: isActive ? 10 : 0,
      textShadowColor: isActive ? 'rgba(255,255,255,0.3)' : 'transparent',
    };
  });

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Animated.Text style={[styles.text, animatedStyle]}>{text}</Animated.Text>
    </Pressable>
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

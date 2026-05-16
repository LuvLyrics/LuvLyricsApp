
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Dimensions, Text, Pressable, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';
import { FlatList } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolateColor,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const LYRIC_LINE_HEIGHT = 68; // fontSize 28 + marginVertical 16*2
import { useSettingsStore } from '../store/settingsStore';

// ------------------------------------------------------------------
// Step 1: The Animated <LyricLine> Component
// ------------------------------------------------------------------

interface LyricLineProps {
  text: string;
  isActive: boolean;
  isPassed: boolean;
  timestamp: number;
  index: number;
  onLyricPress: (timestamp: number) => void;
  onMeasured: (index: number, height: number) => void;
  textStyle?: any;
}

const LyricLine = React.memo(({ text, isActive, isPassed, timestamp, index, onLyricPress, onMeasured, textStyle, songTitle, highlightColor = '#FFD700' }: LyricLineProps & { songTitle?: string, highlightColor?: string }) => {
  const handlePress = useCallback(() => onLyricPress(timestamp), [onLyricPress, timestamp]);
  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    onMeasured(index, e.nativeEvent.layout.height);
  }, [onMeasured, index]);

  // Shared value to drive animations (0 = inactive, 1 = active)
  const activeValue = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    // Apple Music style: Smooth spring-based transition
    activeValue.value = withSpring(isActive ? 1 : 0, {
       mass: 1,
       damping: 15,
       stiffness: 100,
       overshootClamping: false
    });
  }, [isActive, activeValue]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(activeValue.value, [0, 1], [1.0, 1.05], Extrapolation.CLAMP);
    const targetOpacity = isPassed ? 0.5 : 0.3;
    const opacity = interpolate(activeValue.value, [0, 1], [targetOpacity, 1.0], Extrapolation.CLAMP);
    const color = interpolateColor(
        activeValue.value,
        [0, 1],
        ['rgba(255,255,255,0.6)', '#FFFFFF']
    );
    return {
      transform: [{ scale }],
      opacity,
      color,
    };
  });

  // Phrase Matching Logic - "Exact Match Like Dynamic Island"
  const renderedText = React.useMemo(() => {
      if (!songTitle) return text;

      const cleanText = text.replace(/\s+/g, ' ');
      const lowerText = cleanText.toLowerCase();
      const lowerTitle = songTitle.toLowerCase().trim();

      if (lowerTitle.length < 2) return text;

      const idx = lowerText.indexOf(lowerTitle);
      if (idx === -1) return text;

      const prefix = cleanText.substring(0, idx);
      const match = cleanText.substring(idx, idx + lowerTitle.length);
      const suffix = cleanText.substring(idx + lowerTitle.length);

      return (
          <Text>
              {prefix}
              <Text style={{
                  backgroundColor: highlightColor || 'rgba(255,255,255,0.3)',
                  color: '#FFFFFF',
                  fontWeight: '900',
              }}>
                 {` ${match} `}
              </Text>
              {suffix}
          </Text>
      );
  }, [text, songTitle, highlightColor]);

  return (
    <Pressable onPress={handlePress} onLayout={handleLayout}>
      <Animated.Text style={[styles.lyricText, textStyle, animatedStyle]}>
        {renderedText}
      </Animated.Text>
    </Pressable>
  );
});

// ------------------------------------------------------------------
// Step 2: The Synchronized FlatList
// ------------------------------------------------------------------

interface SynchronizedLyricsProps {
  lyrics: { timestamp: number; text: string }[];
  currentTime: number;
  onLyricPress: (timestamp: number) => void;
  isUserScrolling?: boolean;
  onScrollStateChange?: (isScrolling: boolean) => void;
  headerContent?: React.ReactNode;
  textStyle?: any;
  scrollEnabled?: boolean;
  activeLinePosition?: number; // 0.0 to 1.0 (default 0.5)
  songTitle?: string;
  highlightColor?: string;
  topSpacerHeight?: number;
  bottomSpacerHeight?: number;
  expandedAt?: number; // timestamp (Date.now()) when panel opened — resets initial scroll
}

const SynchronizedLyrics: React.FC<SynchronizedLyricsProps> = ({
  lyrics,
  currentTime,
  onLyricPress,
  isUserScrolling = false,
  onScrollStateChange,
  headerContent,
  textStyle,
  scrollEnabled = true,
  activeLinePosition = 0.5,
  songTitle,
  highlightColor,
  topSpacerHeight = SCREEN_HEIGHT * 0.4,
  bottomSpacerHeight = SCREEN_HEIGHT * 0.4,
  expandedAt = 0,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [isLayoutReady, setIsLayoutReady] = React.useState(false);
  const hasInitialScrolled = useRef(false);
  const prevExpandedAt = useRef(expandedAt);

  // Per-item measured heights and precomputed offsets
  const itemHeights = useRef<number[]>([]);
  const itemOffsets = useRef<number[]>([]);

  const recomputeOffsets = useCallback(() => {
    let offset = topSpacerHeight;
    const offsets: number[] = [];
    for (let i = 0; i < lyrics.length; i++) {
      offsets.push(offset);
      offset += itemHeights.current[i] ?? LYRIC_LINE_HEIGHT;
    }
    itemOffsets.current = offsets;
  }, [topSpacerHeight, lyrics.length]);

  // Initialise offset table when lyrics or spacer changes
  useEffect(() => {
    recomputeOffsets();
  }, [recomputeOffsets]);

  const handleItemMeasured = useCallback((idx: number, height: number) => {
    if (Math.abs((itemHeights.current[idx] ?? LYRIC_LINE_HEIGHT) - height) > 1) {
      itemHeights.current[idx] = height;
      recomputeOffsets();
    }
  }, [recomputeOffsets]);

  const { lyricsDelay } = useSettingsStore();

  const effectiveTime = currentTime + lyricsDelay;

  const activeIndex = lyrics.findIndex((line, i) => {
    const nextLine = lyrics[i + 1];
    return effectiveTime >= line.timestamp && (!nextLine || effectiveTime < nextLine.timestamp);
  });

  const containerOpacity = useSharedValue(1);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(containerOpacity.value, { duration: 200 })
  }));

  // ⚡ SCROLL CONTROL
  useEffect(() => {
    // Reset initial-scroll flag when the panel is re-opened (expandedAt changed)
    if (expandedAt !== prevExpandedAt.current) {
      hasInitialScrolled.current = false;
      prevExpandedAt.current = expandedAt;
    }

    if (!isLayoutReady || isUserScrolling || !flatListRef.current) return;
    if (activeIndex < 0 || activeIndex >= lyrics.length) return;

    const performScroll = (isInitial = false) => {
      if (!flatListRef.current) return;
      try {
        flatListRef.current.scrollToIndex({
          index: activeIndex,
          animated: !isInitial,
          viewPosition: activeLinePosition,
        });
        if (isInitial) hasInitialScrolled.current = true;
      } catch (e) {
        if (__DEV__) console.log('[SynchronizedLyrics] Scroll failed:', e);
      }
    };

    if (!hasInitialScrolled.current) {
      const timers = [
        setTimeout(() => performScroll(true), 50),
        setTimeout(() => performScroll(true), 250),
        setTimeout(() => performScroll(true), 500),
      ];
      return () => timers.forEach(t => clearTimeout(t));
    } else {
      performScroll(false);
    }
  }, [activeIndex, isLayoutReady, isUserScrolling, lyrics.length, activeLinePosition, expandedAt]);

  // getItemLayout uses measured heights — accurate for wrapped lines
  const getItemLayout = useCallback((_: unknown, idx: number) => ({
    length: itemHeights.current[idx] ?? LYRIC_LINE_HEIGHT,
    offset: itemOffsets.current[idx] ?? (topSpacerHeight + idx * LYRIC_LINE_HEIGHT),
    index: idx,
  }), [topSpacerHeight]);

  const renderItem = useCallback(({ item, index }: { item: { timestamp: number; text: string }; index: number }) => (
    <LyricLine
      text={item.text}
      isActive={index === activeIndex}
      isPassed={index < activeIndex}
      timestamp={item.timestamp}
      index={index}
      onLyricPress={onLyricPress}
      onMeasured={handleItemMeasured}
      textStyle={textStyle}
      songTitle={songTitle}
      highlightColor={highlightColor}
    />
  ), [activeIndex, onLyricPress, handleItemMeasured, textStyle, songTitle, highlightColor]);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <MaskedView
        style={styles.maskedView}
        maskElement={
          <LinearGradient
            colors={['transparent', 'black', 'black', 'transparent']}
            locations={[0, 0.15, 0.85, 1]}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <FlatList
          ref={flatListRef}
          onLayout={() => setIsLayoutReady(true)}
          data={lyrics}
          keyExtractor={(item, idx) => `${idx}_${item.timestamp}`}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          scrollEnabled={scrollEnabled}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={15}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={
            <View>
              <View style={{ height: topSpacerHeight }} />
              {headerContent}
            </View>
          }
          ListFooterComponent={<View style={{ height: bottomSpacerHeight }} />}
          onScrollBeginDrag={() => onScrollStateChange?.(true)}
          onMomentumScrollEnd={() => onScrollStateChange?.(false)}
          onScrollEndDrag={() => {
            setTimeout(() => onScrollStateChange?.(false), 2000);
          }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            new Promise(resolve => setTimeout(resolve, 500)).then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: activeLinePosition });
            });
          }}
        />
      </MaskedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  maskedView: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  lyricText: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'left',
    marginVertical: 16,
    paddingHorizontal: 32,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  }
});

export default SynchronizedLyrics;

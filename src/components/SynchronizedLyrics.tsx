
import React, { useEffect, useRef, useCallback } from 'react';
import { View, Dimensions, Text, Pressable, StyleSheet, Platform } from 'react-native';
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
// ITEM_HEIGHT removed as unused
import { useSettingsStore } from '../store/settingsStore';

// ------------------------------------------------------------------
// Step 1: The Animated <LyricLine> Component
// ------------------------------------------------------------------

interface LyricLineProps {
  text: string;
  isActive: boolean;
  isPassed: boolean;
  onPress: () => void;
  textStyle?: any;
}

const LyricLine = React.memo(({ text, isActive, isPassed, onPress, textStyle, songTitle, highlightColor = '#FFD700' }: LyricLineProps & { songTitle?: string, highlightColor?: string }) => {
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
    // Interpolate Scale: 1.0 -> 1.05 (Subtle pop)
    const scale = interpolate(activeValue.value, [0, 1], [1.0, 1.05], Extrapolation.CLAMP);

    // Interpolate Opacity: 
    // If active (1) -> 1.0
    // If inactive (0) -> isPassed ? 0.5 : 0.3 (More contrast)
    const targetOpacity = isPassed ? 0.5 : 0.3;
    const opacity = interpolate(activeValue.value, [0, 1], [targetOpacity, 1.0], Extrapolation.CLAMP);

    // Interpolate Color: Grey/Transparent -> Solid White
    const color = interpolateColor(
        activeValue.value,
        [0, 1],
        ['rgba(255,255,255,0.6)', '#FFFFFF']
    );
    
    // Blur simulation via opacity and scale
    return {
      transform: [{ scale }],
      opacity,
      color,
    };
  });
  
  // Phrase Matching Logic - "Exact Match Like Dynamic Island"
  const renderedText = React.useMemo(() => {
      if (!songTitle) return text;
      
      const cleanText = text.replace(/\s+/g, ' '); // normalize spaces
      const lowerText = cleanText.toLowerCase();
      const lowerTitle = songTitle.toLowerCase().trim();
      
      // Avoid highlighting if title is too short to be unique (unless it's the whole line)
      if (lowerTitle.length < 2) return text;

      const index = lowerText.indexOf(lowerTitle);
      
      if (index === -1) {
          return text;
      }

      // We found the title in this line!
      const prefix = cleanText.substring(0, index);
      const match = cleanText.substring(index, index + lowerTitle.length);
      const suffix = cleanText.substring(index + lowerTitle.length);

      return (
          <Text>
              {prefix}
              <Text style={{
                  backgroundColor: highlightColor || 'rgba(255,255,255,0.3)',
                  color: '#FFFFFF',
                  fontWeight: '900',
                  // "Dynamic Island" style for text
                  // borderRadius/overflow works on Text in newer RN, but padding might need spaces
                  // Adding thin spaces around might help breathing room
              }}>
                 {` ${match} `}
              </Text>
              {suffix}
          </Text>
      );
  }, [text, songTitle, highlightColor]);

  return (
    <Pressable onPress={onPress}>
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
  isUserScrolling?: boolean; // Optional: pause auto-scroll if user is interacting
  onScrollStateChange?: (isScrolling: boolean) => void;
  headerContent?: React.ReactNode;
  textStyle?: any;
  scrollEnabled?: boolean;
  activeLinePosition?: number; // 0.0 to 1.0 (default 0.5)
  songTitle?: string;
  highlightColor?: string;
  topSpacerHeight?: number;
  bottomSpacerHeight?: number;
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
  activeLinePosition = 0.5, // Default to center
  songTitle,
  highlightColor,
  topSpacerHeight = SCREEN_HEIGHT * 0.4,
  bottomSpacerHeight = SCREEN_HEIGHT * 0.4
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [isLayoutReady, setIsLayoutReady] = React.useState(false);
  const hasInitialScrolled = useRef(false);
  
  const { lyricsDelay } = useSettingsStore();
  
  // Find active index based on time
  // DELAY: User configured offset (default -1.2s)
  const effectiveTime = currentTime + lyricsDelay;

  const activeIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return effectiveTime >= line.timestamp && (!nextLine || effectiveTime < nextLine.timestamp);
  });

  // Opacity for smooth reveal - Default to 1 to ensure visibility
  const containerOpacity = useSharedValue(1);
  
  const containerStyle = useAnimatedStyle(() => {
     return {
         opacity: withTiming(containerOpacity.value, { duration: 200 })
     };
  });

  // ⚡ COMPREHENSIVE SCROLL CONTROL
  useEffect(() => {
    if (!isLayoutReady || isUserScrolling || !flatListRef.current) return;

    const isValidIndex = activeIndex >= 0 && activeIndex < lyrics.length;
    // If invalid index, just show anyway? Or stay hidden?
    // Better to show.
    if (!isValidIndex) {
        return;
    }

    // SCROLL LOGIC
    const performScroll = (isInitial = false) => {
        if (!flatListRef.current) return;

        try {
            flatListRef.current.scrollToIndex({
                index: activeIndex,
                animated: !isInitial, // Instant for first jump
                viewPosition: activeLinePosition,
            });
            if (isInitial) {
                hasInitialScrolled.current = true;
            }
        } catch (e) {
            if (__DEV__) console.log('[SynchronizedLyrics] Scroll failed:', e);
            // If failed, we don't set hasInitialScrolled to true, so it will retry
        }
    };

    if (!hasInitialScrolled.current) {
        // First jump - aggressive retry strategy
        const timers = [
            setTimeout(() => performScroll(true), 50),
            setTimeout(() => performScroll(true), 250),
            setTimeout(() => performScroll(true), 500) // Fallback
        ];
        
        return () => {
             timers.forEach(t => clearTimeout(t));
        };
    } else {
        // Normal progression - only when index changes
        performScroll(false);
    }
  }, [activeIndex, isLayoutReady, isUserScrolling, lyrics.length, activeLinePosition]);

  const renderItem = useCallback(({ item, index }: { item: { timestamp: number; text: string }; index: number }) => {
    const isActive = index === activeIndex;
    const isPassed = index < activeIndex;

    return (
      <LyricLine 
        text={item.text}
        isActive={isActive}
        isPassed={isPassed}
        onPress={() => onLyricPress(item.timestamp)}
        textStyle={textStyle}
        songTitle={songTitle}
        highlightColor={highlightColor}
      />
    );
  }, [activeIndex, onLyricPress, textStyle, songTitle, highlightColor]);

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
          keyExtractor={(item, index) => `${index}_${item.timestamp}`}
          renderItem={renderItem}
          scrollEnabled={scrollEnabled}
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
              // Safety timeout to resume if momentum doesn't fire (e.g. slight drag)
              setTimeout(() => onScrollStateChange?.(false), 2000);
          }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
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
    fontSize: 28, // Slightly larger for main view
    fontWeight: '800', // Apple uses very heavy weights for active
    textAlign: 'left',
    marginVertical: 16,
    paddingHorizontal: 32,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  }
});

export default SynchronizedLyrics;

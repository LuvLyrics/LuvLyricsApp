import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  Easing, 
  cancelAnimation 
} from 'react-native-reanimated';


interface InstrumentalWaveformProps {
  active: boolean;
}

const InstrumentalWaveform: React.FC<InstrumentalWaveformProps> = ({ active }) => {
  // Shared values for 3 bars
  const h1 = useSharedValue(10);
  const h2 = useSharedValue(16);
  const h3 = useSharedValue(10);

  useEffect(() => {
    if (active) {
      // Bar 1 Animation
      h1.value = withRepeat(
        withSequence(
            withTiming(24, { duration: 500, easing: Easing.inOut(Easing.ease) }),
            withTiming(10, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );

      // Bar 2 Animation (Slightly faster/different)
      h2.value = withRepeat(
        withSequence(
            withTiming(32, { duration: 400, easing: Easing.inOut(Easing.ease) }),
            withTiming(16, { duration: 400, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );

      // Bar 3 Animation (Offset)
      h3.value = withRepeat(
        withSequence(
            withTiming(24, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(10, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );
    } else {
      cancelAnimation(h1);
      cancelAnimation(h2);
      cancelAnimation(h3);
      h1.value = withTiming(4);
      h2.value = withTiming(4);
      h3.value = withTiming(4);
    }
  }, [active]);

  const style1 = useAnimatedStyle(() => ({ height: h1.value }));
  const style2 = useAnimatedStyle(() => ({ height: h2.value }));
  const style3 = useAnimatedStyle(() => ({ height: h3.value }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bar, style1, active && styles.activeBar]} />
      <Animated.View style={[styles.bar, style2, active && styles.activeBar]} />
      <Animated.View style={[styles.bar, style3, active && styles.activeBar]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center', // Center vertically: Since bars grow from center or bottom? 
    // If we want them to grow from center, we need justifyContent center. 
    // And bars need active height change. 
    // Let's use alignItems 'flex-end' to simulate ground? Or 'center' for eq.
    justifyContent: 'center',
    gap: 4,
    height: 40
  },
  bar: {
    width: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  activeBar: {
    backgroundColor: '#ffffff', // White to match lyrics
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  }
});

export default InstrumentalWaveform;

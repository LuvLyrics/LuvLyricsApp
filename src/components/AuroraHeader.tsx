/**
 * 🌌 LyricFlow - Aurora Header (Clean Aurora Effect)
 * -----------------------------------------------------------
 * - REFINED COLORS: Slightly Brighter & More Saturated
 * - Adjusted Bleanding: "Semi-Blend" (distinct but soft)
 * - Removed Texture/Noise (Clean look)
 * - Smooth fade without hard lines
 */

import React from 'react';
import { View, StyleSheet, Dimensions, Image as RNImage } from 'react-native';
import { Canvas, Circle, Rect, Oval, BlurMask, vec, Group } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue, withRepeat, withTiming, useDerivedValue, Easing } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Extended height for smooth fade
const AURORA_HEIGHT = SCREEN_HEIGHT * 1.0; // Increased to full height per user request

// REFINED COLORS: Brighter & Saturated
const COLOR_1 = '#EA7980'; // Saturated but slightly softer Peach/Rose
const COLOR_2 = '#1D728F'; // Saturated Deep Teal Blue
const COLOR_3 = '#155252'; // Richer Dark Evergreen
const BASE_DARK = '#000000';

export type AuroraPalette = 'library' | 'search' | 'settings' | 'nowPlaying';

interface AuroraBackgroundProps {
  palette?: AuroraPalette;
  colors?: string[]; // Custom colors override palette
  imageUri?: string | null; // Optional blurred image background
  animated?: boolean; // Toggle animation
}

export const AuroraHeader: React.FC<AuroraBackgroundProps> = ({
  colors,
  imageUri,
  animated = false,
}) => {
  // Animation Values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  React.useEffect(() => {
    if (animated) {
      // Significantly slower: 20s -> 90s for rotation
      rotation.value = withRepeat(withTiming(360, { duration: 90000, easing: Easing.linear }), -1);
      // 5s -> 20s for scale
      scale.value = withRepeat(withTiming(1.15, { duration: 20000, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      rotation.value = 0;
      scale.value = 1;
    }
  }, [animated]);

  // Derived Transforms
  const t1 = useDerivedValue(() => [{ rotate: 25 + (rotation.value * 0.5) }, { scale: scale.value }]);
  const t2 = useDerivedValue(() => [{ rotate: -25 - (rotation.value * 0.3) }, { scale: scale.value }]);
  const t3 = useDerivedValue(() => [{ rotate: rotation.value * 0.2 }, { scale: scale.value * 0.9 }]);
  // Use custom colors if provided, otherwise fallback to hardcoded palettes (though currently only constants differ slightly)
  // For now, if colors provided, map them to COLOR_1, COLOR_2, COLOR_3
  const activeColors = colors && colors.length >= 2 ? [
     colors[0],
     colors[1],
     colors[2] || colors[0] // Fallback for 3rd color
  ] : [COLOR_1, COLOR_2, COLOR_3];
  
  const c1 = activeColors[0];
  const c2 = activeColors[1];
  const c3 = activeColors[2];
  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.auroraArea}>
        <Canvas style={styles.canvas}>
          <Rect x={0} y={0} width={SCREEN_WIDTH} height={AURORA_HEIGHT} color={BASE_DARK} />


          
          <Group transform={t2} origin={vec(SCREEN_WIDTH * 0.2, AURORA_HEIGHT * 0.3)}>
            <Oval
              x={-SCREEN_WIDTH * 0.2}
              y={-AURORA_HEIGHT * 0.2}
              width={SCREEN_WIDTH * 0.8}
              height={AURORA_HEIGHT * 0.8}
              color={c2}
              opacity={0.4} 
            >
              <BlurMask blur={70} style="normal" />
            </Oval>
          </Group>

          <Group transform={t1} origin={vec(SCREEN_WIDTH * 0.8, AURORA_HEIGHT * 0.3)}>
            <Oval
              x={SCREEN_WIDTH * 0.5}
              y={-AURORA_HEIGHT * 0.1}
              width={SCREEN_WIDTH * 0.6}
              height={AURORA_HEIGHT * 0.7}
              color={c1}
              opacity={0.3} 
            >
              <BlurMask blur={70} style="normal" />
            </Oval>
          </Group>

          <Group transform={t3} origin={vec(SCREEN_WIDTH * 0.5, AURORA_HEIGHT * 0.6)}>
            <Oval
              x={SCREEN_WIDTH * 0.2} 
              y={AURORA_HEIGHT * 0.2} 
              width={SCREEN_WIDTH * 0.6} 
              height={AURORA_HEIGHT * 0.8} 
              color={c3}
              opacity={0.5} 
            >
              <BlurMask blur={90} style="normal" />
            </Oval>
          </Group>
        </Canvas>

        {/* Blurred Image Background (Behind Fade) */}
        {imageUri && (
          <RNImage 
            source={{ uri: imageUri }} 
            style={[
              StyleSheet.absoluteFill, 
              { 
                height: AURORA_HEIGHT,
                opacity: 0.6, 
                transform: [{ scale: 1.2 }] 
              } 
            ]}
            blurRadius={90} 
            resizeMode="cover"
          />
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.6)', BASE_DARK]}
          locations={[0.1, 0.45, 0.8, 1]}
          style={styles.fadeToBlack}
        />
      </View>
      


      {/* Rest of screen remains dark */}
      <View style={styles.darkArea} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  auroraArea: {
    height: AURORA_HEIGHT,
    backgroundColor: BASE_DARK,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
  fadeToBlack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: AURORA_HEIGHT, // Full height for smooth transition
  },
  darkArea: {
    flex: 1,
    backgroundColor: BASE_DARK,
  },
});

export default AuroraHeader;

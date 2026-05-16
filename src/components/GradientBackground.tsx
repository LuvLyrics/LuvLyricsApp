/**
 * 🌌 LyricFlow - Gradient Background for Now Playing
 * -----------------------------------------------------------
 * Same premium aurora effect using song colors
 */

import React from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Canvas, Circle, Group, BlurMask } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { getGradientById, GRADIENTS } from '../constants/gradients';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GradientBackgroundProps {
  gradientId: string;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  gradientId,
}) => {
  const gradient = getGradientById(gradientId) ?? GRADIENTS[0];
  const colors = gradient.colors;

  const LARGE_RADIUS = SCREEN_WIDTH * 1.5;
  const SMALL_RADIUS = SCREEN_WIDTH * 1.0;
  const LARGE_BLUR = 100;
  const SMALL_BLUR = 70;
  const LARGE_OPACITY = 0.2;
  const SMALL_OPACITY = 0.28;

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container} pointerEvents="none">
        <View style={styles.darkBase} />
        <View style={[styles.webBlob, styles.webBlobLarge, { 
          backgroundColor: colors[0],
          top: -SCREEN_HEIGHT * 0.45,
          left: -SCREEN_WIDTH * 0.55,
          opacity: 0.2,
        }]} />
        <View style={[styles.webBlob, styles.webBlobLarge, { 
          backgroundColor: colors[1],
          top: -SCREEN_HEIGHT * 0.4,
          right: -SCREEN_WIDTH * 0.5,
          opacity: 0.2,
        }]} />
        <View style={[styles.webBlob, styles.webBlobSmall, { 
          backgroundColor: colors[0],
          top: -SCREEN_HEIGHT * 0.3,
          left: -SCREEN_WIDTH * 0.4,
          opacity: 0.32,
        }]} />
        <View style={[styles.webBlob, styles.webBlobSmall, { 
          backgroundColor: colors[1],
          top: -SCREEN_HEIGHT * 0.25,
          right: -SCREEN_WIDTH * 0.35,
          opacity: 0.32,
        }]} />
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.darkBase} />
      
      <Canvas style={styles.canvas}>
        <Group>
          {/* Large faint blobs that meet in middle */}
          <Circle
            cx={-SCREEN_WIDTH * 0.25}
            cy={-SCREEN_HEIGHT * 0.15}
            r={LARGE_RADIUS}
            color={colors[0]}
            opacity={LARGE_OPACITY}
          >
            <BlurMask blur={LARGE_BLUR} style="normal" />
          </Circle>
          
          <Circle
            cx={SCREEN_WIDTH + SCREEN_WIDTH * 0.25}
            cy={-SCREEN_HEIGHT * 0.1}
            r={LARGE_RADIUS}
            color={colors[1]}
            opacity={LARGE_OPACITY}
          >
            <BlurMask blur={LARGE_BLUR} style="normal" />
          </Circle>
          
          {/* Smaller brighter blobs for depth */}
          <Circle
            cx={-SCREEN_WIDTH * 0.1}
            cy={-SCREEN_HEIGHT * 0.05}
            r={SMALL_RADIUS}
            color={colors[0]}
            opacity={SMALL_OPACITY}
          >
            <BlurMask blur={SMALL_BLUR} style="normal" />
          </Circle>
          
          <Circle
            cx={SCREEN_WIDTH + SCREEN_WIDTH * 0.05}
            cy={0}
            r={SMALL_RADIUS}
            color={colors[1]}
            opacity={SMALL_OPACITY}
          >
            <BlurMask blur={SMALL_BLUR} style="normal" />
          </Circle>
        </Group>
      </Canvas>

      <LinearGradient
        colors={['transparent', 'rgba(5,5,8,0.4)', '#050508']}
        locations={[0, 0.5, 1]}
        style={styles.fadeOverlay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  darkBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050508',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  fadeOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: SCREEN_HEIGHT * 0.35,
  },
  webBlob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  webBlobLarge: {
    width: SCREEN_WIDTH * 3,
    height: SCREEN_WIDTH * 3,
    // @ts-ignore
    filter: 'blur(150px)',
  },
  webBlobSmall: {
    width: SCREEN_WIDTH * 2,
    height: SCREEN_WIDTH * 2,
    // @ts-ignore
    filter: 'blur(100px)',
  },
});

export default GradientBackground;

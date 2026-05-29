import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { AuroraHeader } from './AuroraHeader';

interface NowPlayingBackgroundProps {
  isDynamicTheme: boolean;
  coverImageUri?: string;
  gradientColors: string[];
  animateBackground: boolean;
  blob1Style: any;
  blob2Style: any;
  blob3Style: any;
  isDark: boolean;
}

const { width } = require('react-native').Dimensions.get('window');

const NowPlayingBackground: React.FC<NowPlayingBackgroundProps> = ({
  isDynamicTheme,
  coverImageUri,
  gradientColors,
  animateBackground,
  blob1Style,
  blob2Style,
  blob3Style,
  isDark,
}) => {
  if (isDynamicTheme && coverImageUri) {
    return (
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <Image
          source={{ uri: coverImageUri }}
          style={[StyleSheet.absoluteFill, { opacity: 0.15 }]}
          blurRadius={120}
          resizeMode="cover"
        />
        <Animated.View style={[{ position: 'absolute', top: -width * 0.5, left: -width * 0.5, width: width * 2, height: width * 2, borderRadius: width }, blob1Style]}>
          <Image source={{ uri: coverImageUri }} style={{ width: '100%', height: '100%', opacity: 0.4 }} blurRadius={100} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', bottom: -width * 0.5, right: -width * 0.5, width: width * 2, height: width * 2, borderRadius: width }, blob2Style]}>
          <Image source={{ uri: coverImageUri }} style={{ width: '100%', height: '100%', opacity: 0.35 }} blurRadius={110} />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: width * 1.8, height: width * 1.8, borderRadius: width }, blob3Style]}>
          <Image source={{ uri: coverImageUri }} style={{ width: '100%', height: '100%', opacity: 0.25 }} blurRadius={90} />
        </Animated.View>
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)', '#000']}
          locations={[0.2, 0.7, 1.0]}
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  if (isDark) {
    return <AuroraHeader colors={gradientColors} animated={animateBackground} />;
  }

  return null;
};

export default React.memo(NowPlayingBackground);

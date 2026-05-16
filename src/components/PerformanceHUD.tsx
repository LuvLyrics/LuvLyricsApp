import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
  useFrameCallback, 
  useSharedValue, 
  runOnJS 
} from 'react-native-reanimated';
import { useSettingsStore } from '../store/settingsStore';

export const PerformanceHUD: React.FC = () => {
  const showHUD = useSettingsStore(state => state.showPerformanceHUD);
  const [fps, setFps] = useState(0);
  const frameCount = useSharedValue(0);
  const lastTimestamp = useSharedValue(0);

  useFrameCallback((frameInfo) => {
    'worklet';
    if (!showHUD) return;
    
    if (lastTimestamp.value === 0) {
      lastTimestamp.value = frameInfo.timestamp;
      return;
    }

    frameCount.value++;
    const elapsed = frameInfo.timestamp - lastTimestamp.value;

    if (elapsed >= 1000) {
      const currentFps = Math.round((frameCount.value / elapsed) * 1000);
      runOnJS(setFps)(currentFps);
      frameCount.value = 0;
      lastTimestamp.value = frameInfo.timestamp;
    }
  }, showHUD);

  if (!__DEV__ || !showHUD) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.badge}>
        <Text style={styles.fpsText}>{fps} FPS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    zIndex: 9999,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  fpsText: {
    color: '#00FF00',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'System',
  },
});

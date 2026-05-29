/**
 * LyricFlow - Premium pill-shaped navigation bar
 * Matches Dynamic Island aesthetic with live song color theming
 */

import React from 'react';
import { View, StyleSheet, Pressable, Platform, ImageBackground } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeColors, useIsDark } from '../contexts/ThemeContext';

export const ModernPillTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const coverImageUri = usePlayerStore(s => s.currentSong?.coverImageUri);
  const isDynamicIsland = useSettingsStore(s => s.miniPlayerStyle === 'island');
  const isDark = useIsDark();
  const colors = useThemeColors();

  // Completely hide tab bar on Luvs
  const currentRoute = state.routes[state.index];
  if (currentRoute.name === 'Luvs') {
    return null;
  }

  const activeIconColor = isDark ? '#FFFFFF' : colors.textPrimary;
  const inactiveIconColor = isDark ? 'rgba(255,255,255,0.45)' : colors.textMuted;

  const pillBg = isDark ? '#0A0A0C' : '#FFFFFF';
  const overlayColor = isDark ? '#0A0A0C' : '#FFFFFF';
  const overlayOpacity = isDark ? 0.90 : 0.82;
  const fallbackBg = isDark ? 'rgba(10,10,12,0.98)' : 'rgba(255,255,255,0.98)';
  const gradientColors: [string, string] = isDark
    ? ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)']
    : ['rgba(255,255,255,0.1)', 'rgba(248,248,252,0.5)'];
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={styles.container}>
      <View style={[styles.pillContainer, { backgroundColor: pillBg, borderColor }]}>
        {/* Dynamic Background */}
        <View style={StyleSheet.absoluteFill}>
          {isDynamicIsland && coverImageUri ? (
            <ImageBackground
              source={{ uri: coverImageUri }}
              style={StyleSheet.absoluteFill}
              blurRadius={40}
            >
              <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor, opacity: overlayOpacity }]} />
            </ImageBackground>
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: fallbackBg }]} />
          )}

          <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />
        </View>

        <BlurView intensity={60} tint={isDark ? 'dark' : 'light'} style={styles.blur}>
          <View style={styles.tabsRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;

              const onPress = async () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);

                  if (route.name === 'Luvs') {
                    const { feedSongs } = (await import('../store/luvsFeedStore')).useLuvsFeedStore.getState();
                    if (feedSongs.length === 0) {
                      import('../services/LuvsRecommendationEngine').then(m => m.luvsRecommendationEngine.refreshRecommendation()).catch(console.error);
                    }
                  }
                } else if (isFocused && route.name === 'Luvs') {
                  import('../services/LuvsRecommendationEngine').then(m => m.luvsRecommendationEngine.refreshRecommendation()).catch(console.error);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={styles.tabItem}
                >
                  {options.tabBarIcon?.({
                    focused: isFocused,
                    color: isFocused ? activeIconColor : inactiveIconColor,
                    size: 24,
                  })}
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    pointerEvents: 'box-none',
  },
  pillContainer: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 24,
  },
  blur: {
    overflow: 'hidden',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 56,
  },
});

export default ModernPillTabBar;

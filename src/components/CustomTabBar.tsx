/**
 * LyricFlow - Custom Tab Bar
 * Dynamic Island style with glassmorphism
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(120,120,128,0.2)', 'rgba(120,120,128,0.1)']}
        style={styles.gradient}
      >
        <BlurView intensity={80} tint="dark" style={styles.blur}>
          <View style={styles.tabBar}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              let iconName: keyof typeof Ionicons.glyphMap = 'home';
              if (route.name === 'Library') iconName = 'home';
              if (route.name === 'Search') iconName = 'search';
              if (route.name === 'Settings') iconName = 'settings';

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={styles.tab}
                >
                  <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
                    <Ionicons
                      name={iconName}
                      size={24}
                      color={isFocused ? '#fff' : 'rgba(255,255,255,0.5)'}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  gradient: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  blur: {
    flex: 1,
    borderRadius: 32,
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});

export default CustomTabBar;

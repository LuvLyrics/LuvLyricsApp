import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TabParamList } from '../types/navigation';
import { ModernPillTabBar } from '../components/ModernPillTabBar';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeColors, useIsDark } from '../contexts/ThemeContext';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import LibraryScreen from '../screens/LibraryScreen';
import LuvsScreen from '../screens/LuvsScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const DarkTabBarBackground = () => (
  <LinearGradient
    colors={['rgba(10,10,12,0.98)', 'rgba(5,5,6,1)']}
    style={StyleSheet.absoluteFill}
    start={{ x: 0, y: 0 }}
    end={{ x: 0, y: 1 }}
  />
);

const LightTabBarBackground = () => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA' }]} />
);

const HomeIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
);

const LuvsIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <MaterialCommunityIcons name={focused ? 'heart-multiple' : 'heart-multiple-outline'} size={24} color={color} />
);

const LibraryIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'library' : 'library-outline'} size={24} color={color} />
);

const SettingsIcon = ({ color, focused }: { color: string; focused: boolean }) => (
  <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
);

const renderModernPillTabBar = (props: BottomTabBarProps) => <ModernPillTabBar {...props} />;

export const TabNavigator: React.FC = () => {
  const colors = useThemeColors();
  const isDark = useIsDark();
  const navBarStyle = useSettingsStore(state => state.navBarStyle);
  const miniPlayerStyle = useSettingsStore(state => state.miniPlayerStyle);
  const setMiniPlayerStyle = useSettingsStore(state => state.setMiniPlayerStyle);

  React.useEffect(() => {
    if (navBarStyle === 'modern-pill' && miniPlayerStyle === 'bar') {
      setMiniPlayerStyle('island');
    }
  }, [navBarStyle, miniPlayerStyle, setMiniPlayerStyle]);

  const activeTint = isDark ? '#fff' : colors.primary;
  const inactiveTint = isDark ? 'rgba(255,255,255,0.5)' : colors.textMuted;
  const TabBarBackground = isDark ? DarkTabBarBackground : LightTabBarBackground;

  return (
    <Tab.Navigator
      id="MainTabs"
      tabBar={navBarStyle === 'modern-pill' ? renderModernPillTabBar : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarShowLabel: navBarStyle === 'classic',
        tabBarStyle: navBarStyle === 'classic' ? styles.tabBar : undefined,
        tabBarBackground: navBarStyle === 'classic' ? TabBarBackground : undefined,
      }}
    >
      <Tab.Screen name="Home" component={LibraryScreen} options={{ tabBarLabel: 'Home', tabBarIcon: HomeIcon }} />
      <Tab.Screen name="Luvs" component={LuvsScreen} options={{ tabBarLabel: 'Luvs', tabBarIcon: LuvsIcon }} />
      <Tab.Screen name="Library" component={PlaylistsScreen} options={{ tabBarLabel: 'Library', tabBarIcon: LibraryIcon }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: SettingsIcon }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: 70,
    paddingTop: 8,
    paddingBottom: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
  },
});

export default TabNavigator;

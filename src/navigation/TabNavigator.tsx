import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TabParamList } from '../types/navigation';
import { Colors } from '../constants/colors';
import { CustomTabBar } from '../components/CustomTabBar';
import { ModernPillTabBar } from '../components/ModernPillTabBar';
import { useSettingsStore } from '../store/settingsStore';

// Import screens
import LibraryScreen from '../screens/LibraryScreen';
import LuvsScreen from '../screens/LuvsScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator: React.FC = () => {
  const navBarStyle = useSettingsStore(state => state.navBarStyle);
  const miniPlayerStyle = useSettingsStore(state => state.miniPlayerStyle);
  const setMiniPlayerStyle = useSettingsStore(state => state.setMiniPlayerStyle);

  // Auto-enable Dynamic Island when Modern Pill navbar is active
  React.useEffect(() => {
    if (navBarStyle === 'modern-pill' && miniPlayerStyle === 'bar') {
      setMiniPlayerStyle('island');
    }
  }, [navBarStyle, miniPlayerStyle, setMiniPlayerStyle]);

  return (
    <Tab.Navigator
      id="MainTabs"
      tabBar={navBarStyle === 'modern-pill' ? (props) => <ModernPillTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarShowLabel: navBarStyle === 'classic', // Show labels in classic mode
        tabBarStyle: navBarStyle === 'classic' ? styles.tabBar : undefined,
        tabBarBackground: navBarStyle === 'classic' ? () => (
            <LinearGradient
                colors={['rgba(20,20,20,0.95)', 'rgba(10,10,10,1)']}
                style={StyleSheet.absoluteFill}
                start={{x: 0, y: 0}}
                end={{x: 0, y: 1}}
            />
        ) : undefined,
      }}
    >
      <Tab.Screen
        name="Home"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Luvs"
        component={LuvsScreen}
        options={{
          tabBarLabel: 'Luvs',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'heart-multiple' : 'heart-multiple-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={PlaylistsScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'library' : 'library-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent', // Handled by tabBarBackground gradient
    borderTopWidth: 0, // Remove border for seamless gradient look
    // borderTopColor: 'rgba(255,255,255,0.1)',
    height: 70,
    paddingTop: 8,
    paddingBottom: 10,
    position: 'absolute', // Required for blur/translucency over content
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0, // Remove shadow to blend
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default TabNavigator;

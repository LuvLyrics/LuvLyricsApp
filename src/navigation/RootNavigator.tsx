/**
 * LyricFlow - Root Navigator
 * Stack navigation with tab navigator and modal screens
 */

import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Colors } from '../constants/colors';

// Import navigators and screens
import TabNavigator from './TabNavigator';
import NowPlayingScreen from '../screens/NowPlayingScreen';
import AddEditLyricsScreen from '../screens/AddEditLyricsScreen';
import SearchScreen from '../screens/SearchScreen';
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';
import { AudioDownloaderScreen } from '../screens/AudioDownloaderScreen';
import { YoutubeBrowserScreen } from '../screens/YoutubeBrowserScreen';
import { MiniPlayer } from '../components/MiniPlayer';
import { BackgroundDownloader } from '../components/BackgroundDownloader';
import { CreatePlaylistModal } from '../components/CreatePlaylistModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const navigationRef = useNavigationContainerRef();
  const [currentRoute, setCurrentRoute] = React.useState<string | undefined>();

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute();
        setCurrentRoute(route?.name);
      }}
    >
      <View style={{ flex: 1 }}>
        <Stack.Navigator
          id="RootStack"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        >
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="NowPlaying"
            component={NowPlayingScreen}
            options={{
              presentation: 'fullScreenModal',
            }}
          />
          <Stack.Screen
            name="AddEditLyrics"
            component={AddEditLyricsScreen}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
          />
          <Stack.Screen
            name="CreatePlaylist"
            component={CreatePlaylistModal}
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="AddToPlaylist"
            component={AddToPlaylistModal}
            options={{
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="PlaylistDetail"
            component={PlaylistDetailScreen}
          />
          <Stack.Screen
            name="AudioDownloader"
            component={AudioDownloaderScreen}
          />
          <Stack.Screen
            name="YoutubeBrowser"
            component={YoutubeBrowserScreen}
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack.Navigator>
        
        {/* Hide MiniPlayer on Luvs tab */}
        {currentRoute !== 'Luvs' && <MiniPlayer />}
        <BackgroundDownloader />
      </View>
    </NavigationContainer>
  );
};

export default RootNavigator;

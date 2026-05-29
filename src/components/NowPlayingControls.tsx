import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import TimelineScrubber from './TimelineScrubber';

interface NowPlayingControlsProps {
  animatedStyle: any;
  controlsVisible: boolean;
  isDark: boolean;
  colors: {
    textPrimary: string;
    textSecondary: string;
    card: string;
  };
  coverImageUri?: string;
  storePlaying: boolean;
  currentSongTitle?: string;
  currentSongArtist?: string;
  isCurrentSongLiked: boolean;
  playButtonStyle: any;
  onTogglePlay: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onToggleLike: () => void;
  onToggleLyrics: () => void;
  positionSV: any;
  durationSV: any;
  onSeek: (seconds: number) => void;
}

const NowPlayingControls: React.FC<NowPlayingControlsProps> = ({
  animatedStyle,
  controlsVisible,
  isDark,
  colors,
  coverImageUri,
  storePlaying,
  currentSongTitle,
  currentSongArtist,
  isCurrentSongLiked,
  playButtonStyle,
  onTogglePlay,
  onSkipForward,
  onSkipBackward,
  onToggleLike,
  onToggleLyrics,
  positionSV,
  durationSV,
  onSeek,
}) => {
  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents={controlsVisible ? 'auto' : 'none'}>
      <View style={[styles.pill, { backgroundColor: isDark ? '#181818' : colors.card }]}>
        {coverImageUri && (
          <Image
            source={{ uri: coverImageUri }}
            style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.5 : 0.15 }]}
            blurRadius={50}
          />
        )}
        <LinearGradient
          colors={isDark ? ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)'] : ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.7)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={{ position: 'absolute', top: 15, right: 20, zIndex: 10 }}>
            <Pressable onPress={onToggleLyrics} style={{ padding: 4 }}>
              <Ionicons name="ellipsis-horizontal" size={24} color={isDark ? "rgba(255,255,255,0.6)" : colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.controls}>
            <Pressable onPress={onSkipBackward} style={styles.controlBtn}>
              <Ionicons name="play-back" size={24} color={colors.textPrimary} />
            </Pressable>

            <Pressable onPress={onTogglePlay} style={[styles.playBtn, { backgroundColor: isDark ? '#fff' : colors.textPrimary }]}>
              <Animated.View style={playButtonStyle}>
                <Ionicons
                  name={storePlaying ? 'pause' : 'play'}
                  size={32}
                  color={isDark ? '#000' : '#fff'}
                />
              </Animated.View>
            </Pressable>

            <Pressable onPress={onSkipForward} style={styles.controlBtn}>
              <Ionicons name="play-forward" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={{ marginVertical: 8 }}>
            <TimelineScrubber
              currentTime={positionSV}
              duration={durationSV}
              onSeek={onSeek}
              variant="classic"
            />
          </View>

          <View style={[styles.miniInfo, { paddingHorizontal: 40 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[styles.miniTitle, { color: colors.textPrimary }]} numberOfLines={1}>{currentSongTitle}</Text>
                <Text style={[styles.miniArtist, { color: colors.textSecondary }]} numberOfLines={1}>{currentSongArtist}</Text>
              </View>

              <Pressable
                onPress={onToggleLike}
                style={({ pressed }) => [
                  { position: 'absolute', right: -25 },
                  pressed && { transform: [{ scale: 1.4 }] }
                ]}
                hitSlop={15}
              >
                <Ionicons
                  name={isCurrentSongLiked ? "heart" : "heart-outline"}
                  size={30}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  pill: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 5,
    gap: 25,
  },
  controlBtn: {
    padding: 8,
  },
  playBtn: {
    width: 65,
    height: 65,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 5,
  },
  miniTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  miniArtist: {
    fontSize: 12,
  },
});

export default React.memo(NowPlayingControls);

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Text, ViewStyle } from 'react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { useSongsStore } from '../store/songsStore';
import { SongCard } from './SongCard';
import { Song } from '../types/song';

interface RecentlyPlayedGridProps {
  onSongPress: (song: Song) => void;
  onSongLongPress: (song: Song) => void;
  onLikePress: (id: string) => void;
  onMagicPress: (song: Song) => void;
  style?: ViewStyle;
}

export const RecentlyPlayedGrid: React.FC<RecentlyPlayedGridProps> = React.memo(({
  onSongPress,
  onSongLongPress,
  onLikePress,
  onMagicPress,
  style
}) => {
  const songs = useSongsStore(state => state.songs);

  const recentlyPlayed = useMemo(() => {
    return songs
      .filter(song => song.lastPlayed)
      .sort((a, b) => (new Date(b.lastPlayed || 0).getTime() - new Date(a.lastPlayed || 0).getTime()))
      .slice(0, 16);
  }, [songs]);

  if (recentlyPlayed.length === 0) return null;

  return (
    <View style={style}>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.horizontalScroll} 
        decelerationRate="fast" 
        snapToInterval={172}
      >
      {recentlyPlayed.map((song) => (
        <Animated.View 
          key={song.id} 
          style={styles.horizontalCard} 
          entering={FadeInLeft.duration(300)}
        >
          <SongCard
            id={song.id} 
            title={song.title} 
            artist={song.artist} 
            album={song.album} 
            gradientId={song.gradientId}
            coverImageUri={song.coverImageUri} 
            duration={song.duration} 
            isLiked={song.isLiked}
            onPress={() => onSongPress(song)} 
            onLongPress={() => onSongLongPress(song)}
            onLikePress={() => onLikePress(song.id)} 
            onMagicPress={() => onMagicPress(song)}
          />
        </Animated.View>
      ))}
      </ScrollView>
    </View>

  );
});

const styles = StyleSheet.create({
  horizontalScroll: {
    paddingLeft: 26,
    paddingRight: 16,
    gap: 12,
    marginBottom: 20
  },
  horizontalCard: {
    width: 160,
  },

});

/**
 * MosaicCover Component
 * Spotify-style 2x2 grid cover for playlists
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../types/song';

interface MosaicCoverProps {
  songs: Song[];  // Up to 4 songs (should be latest 4)
  size: number;   // Total width/height of the mosaic
}

export const MosaicCover: React.FC<MosaicCoverProps> = ({ songs, size }) => {
  const cellSize = size / 2;
  
  // Handle different numbers of songs
  if (songs.length === 0) {
    return (
      <LinearGradient
        colors={['#4A148C', '#6A1B9A', '#8E24AA']}
        style={[styles.container, { width: size, height: size }]}
      >
        <Ionicons name="musical-notes" size={size * 0.4} color="rgba(255,255,255,0.4)" />
      </LinearGradient>
    );
  }
  
  if (songs.length === 1) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        {songs[0].coverImageUri ? (
          <Image 
            source={{ uri: songs[0].coverImageUri }} 
            style={{ width: size, height: size, borderRadius: 8 }}
          />
        ) : (
          <LinearGradient
            colors={['#1E88E5', '#1976D2']}
            style={[styles.container, { width: size, height: size }]}
          >
            <Ionicons name="disc" size={size * 0.5} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        )}
      </View>
    );
  }
  
  // 2x2 Grid for 2-4 songs
  const gridSongs = songs.slice(0, 4);
  
  return (
    <View style={[styles.grid, { width: size, height: size }]}>
      {[0, 1, 2, 3].map((index) => {
        const song = gridSongs[index];
        
        return (
          <View
            key={index}
            style={[
              styles.gridCell,
              { width: cellSize, height: cellSize },
              index === 1 || index === 3 ? styles.cellRight : null,
              index === 2 || index === 3 ? styles.cellBottom : null,
            ]}
          >
            {song?.coverImageUri ? (
              <Image
                source={{ uri: song.coverImageUri }}
                style={styles.cellImage}
              />
            ) : (
              <LinearGradient
                colors={
                  index === 0 ? ['#E91E63', '#D81B60'] :
                  index === 1 ? ['#9C27B0', '#8E24AA'] :
                  index === 2 ? ['#673AB7', '#5E35B1'] :
                  ['#3F51B5', '#3949AB']
                }
                style={styles.container}
              >
                <Ionicons 
                  name="disc" 
                  size={cellSize * 0.4} 
                  color="rgba(255,255,255,0.3)" 
                />
              </LinearGradient>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridCell: {
    position: 'relative',
  },
  cellRight: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.2)',
  },
  cellBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.2)',
  },
  cellImage: {
    width: '100%',
    height: '100%',
  },
});

export default MosaicCover;

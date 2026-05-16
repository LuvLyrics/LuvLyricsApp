import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Dimensions } from 'react-native';
import { UnifiedSong } from '../types/song';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 8;
// Calculate width based on 2 columns for now, parent can control 

interface DownloadGridCardProps {
  song: UnifiedSong;
  isSelected: boolean;
  isPlayingPreview: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onPlayPress: () => void;
  onArtistPress: () => void;
  selectionMode?: boolean;
}

export const DownloadGridCard = memo(({ 
  song, isSelected, isPlayingPreview, 
  onPress, onLongPress, onPlayPress, onArtistPress, selectionMode 
}: DownloadGridCardProps) => {

  return (
    <Pressable
      style={[styles.container, isSelected && styles.selectedContainer]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Top 70% - Cover Art */}
      <View style={styles.coverContainer}>
        <Image 
          source={{ uri: song.highResArt }} 
          style={styles.coverImage} 
        />
        
        {/* Glassmorphism Overlay for Play/Pause */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          style={styles.gradientOverlay}
        />
        
        {/* Play/Pause Button - Centered */}
        <Pressable 
            style={styles.playButtonOverlay}
            onPress={(e) => {
                e.stopPropagation();
                onPlayPress();
            }}
        >
            <View style={styles.glassButton}>
                <Ionicons 
                    name={isPlayingPreview ? "pause" : "play"} 
                    size={24} 
                    color="#fff" 
                    style={{ marginLeft: isPlayingPreview ? 0 : 2 }} // Optical adjustment
                />
            </View>
        </Pressable>

        {/* Selection Checkmark */}
        {(isSelected || selectionMode) && (
          <View style={[styles.checkmarkBadge, !isSelected && styles.emptyBadge]}>
            <Ionicons 
                name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                size={24} 
                color={isSelected ? Colors.primary : 'rgba(255,255,255,0.5)'} 
            />
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
        
        <Pressable onPress={(e) => {
            e.stopPropagation();
            onArtistPress();
        }}>
            <Text style={styles.artist} numberOfLines={1}>
                {song.artist}{' '}
                {song.isAuthentic && (
                    <Ionicons name="checkmark-circle" size={12} color={Colors.primary} />
                )}
                {' '}
                <Ionicons name="arrow-forward-circle-outline" size={12} color={Colors.primary} />
            </Text>
        </Pressable>
        
        <View style={styles.metaRow}>
             {song.duration && (
                <Text style={styles.metaText}>
                    {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                </Text>
             )}
            
            <View style={[
                styles.providerBadge,
                { backgroundColor: 
                    song.source === 'Saavn' ? '#2ecc71' : // Green
                    song.source === 'Gaana' ? '#e74c3c' : // Red
                    song.source === 'Wynk' ? '#e74c3c' : // Red
                    song.source === 'NetEase' ? '#e60026' : // NetEase Red
                    '#f39c12' // Orange/Yellow
                }
            ]}>
                <Text style={styles.providerText}>{song.source}</Text>
            </View>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: CARD_MARGIN,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    height: 220, 
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 4,
  },
  selectedContainer: {
    borderColor: Colors.primary,
    backgroundColor: '#2A2A2A',
  },
  coverContainer: {
    height: '70%',
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Glass effect
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    // backdropFilter type error fix: remove it as it's not valid RN style
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyBadge: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    height: '30%',
    padding: 8,
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  artist: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    color: '#888',
    fontSize: 11,
  },
  providerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  providerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  StyleSheet, 
  Pressable, 
  FlatList, 
  Dimensions,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { usePlayerStore } from '../store/playerStore';
import { usePlayer } from '../contexts/PlayerContext'; // Import context hook
import Slider from '@react-native-community/slider';
import { formatTime } from '../utils/formatters';
import { BlurView } from 'expo-blur';

interface ManualSyncModalProps {
  visible: boolean;
  onClose: () => void;
  lyricsText: string;
  onSave: (syncedLyrics: string) => void;
  audioUri?: string;
  duration?: number;
}

interface LyricLine {
  id: string; // unique ID for list rendering
  text: string;
  timestamp?: number; // in seconds
  isSynced: boolean;
}



export const ManualSyncModal: React.FC<ManualSyncModalProps> = ({
  visible,
  onClose,
  lyricsText,
  onSave,
  audioUri,
  duration = 0
}) => {
  const currentSong = usePlayerStore(state => state.currentSong);
  const play = usePlayerStore(state => state.play);
  const pause = usePlayerStore(state => state.pause);
  const seekTo = usePlayerStore(state => state.seekTo);
  const storePosition = usePlayerStore(state => state.position);
  const storeDuration = usePlayerStore(state => state.duration);
  const storePlaying = usePlayerStore(state => state.isPlaying);
  
  // We use the usePlayer context hook which returns the expo-audio player instance
  // Note: player might be null if not initialized. We only use it for commands (play/pause/seek)
  // but status is read from the store for thread safety.
  const player = usePlayer();

  const [isPlayingLocal, setIsPlayingLocal] = useState(false);
  const [positionLocal, setPositionLocal] = useState(0);

  // Sync with store
  useEffect(() => {
    setIsPlayingLocal(storePlaying);
  }, [storePlaying]);

  useEffect(() => {
    setPositionLocal(storePosition);
  }, [storePosition]);

  const playerDuration = storeDuration || duration || 0;

  const [lines, setLines] = useState<LyricLine[]>([]);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(-1);
  const flatListRef = useRef<FlatList>(null);

  // Initialize lines from text
  useEffect(() => {
    if (visible && lyricsText) {
      const rawLines = lyricsText.split('\n');
      const parsedLines = rawLines.map((line, index) => {
        // Check if line already has timestamp
        const match = line.match(/^\[(\d+):(\d+(\.\d+)?)\](.*)/);
        let timestamp: number | undefined;
        let text = line;
        let isSynced = false;

        if (match) {
          const min = parseInt(match[1]);
          const sec = parseFloat(match[2]);
          timestamp = min * 60 + sec;
          text = match[4];
          isSynced = true;
        }

        return {
          id: `line-${index}-${Date.now()}`,
          text: text.trim(),
          timestamp,
          isSynced
        };
      });
      setLines(parsedLines);
    }
  }, [visible, lyricsText]);

  // Scroll to active line based on playback position
  useEffect(() => {
    if (!visible || !isPlayingLocal) return;

    // Let's implement active line highlighting based on timestamps
    let currentIdx = -1;
    for (let i = 0; i < lines.length; i++) {
       if (lines[i].timestamp !== undefined && lines[i].timestamp! <= positionLocal) {
           currentIdx = i;
       } else if (lines[i].timestamp !== undefined && lines[i].timestamp! > positionLocal) {
           break;
       }
    }

    if (currentIdx !== activeLineIndex) {
        setActiveLineIndex(currentIdx);
        // Optional: Auto-scroll
        if (flatListRef.current && currentIdx >= 0) {
            flatListRef.current.scrollToIndex({
                index: currentIdx,
                viewPosition: 0.3,
                animated: true
            });
        }
    }
  }, [positionLocal, visible, isPlayingLocal, lines, activeLineIndex]);

  const handleTapLine = (index: number) => {
    const syncTime = positionLocal;
    const newLines = [...lines];
    newLines[index].timestamp = syncTime;
    newLines[index].isSynced = true;
    setLines(newLines);
  };

  // Update play state for UI
  const togglePlay = () => {
      if (isPlayingLocal) pause(); else play();
  };

  const handleSeek = (val: number) => {
    seekTo(val);
    setPositionLocal(val); // optimistic update
  };

  const clearTimestamp = (index: number) => {
     const newLines = [...lines];
     newLines[index].timestamp = undefined;
     newLines[index].isSynced = false;
     setLines(newLines);
  };

  const handleAutoFill = () => {
     // Interpolate logic
     const newLines = [...lines];
     
     // 1. Find all synced indices
     const syncedIndices = newLines
        .map((l, i) => l.isSynced ? i : -1)
        .filter(i => i !== -1);

     if (syncedIndices.length < 2) {
         Alert.alert('Not enough data', 'You need to sync at least the start and end of a section to auto-fill (interpolate) the lines in between.');
         return;
     }

     let filledCount = 0;

     // 2. Interpolate between pairs
     for (let k = 0; k < syncedIndices.length - 1; k++) {
         const startIdx = syncedIndices[k];
         const endIdx = syncedIndices[k+1];
         const gap = endIdx - startIdx - 1;

         if (gap > 0) {
             const startTime = newLines[startIdx].timestamp!;
             const endTime = newLines[endIdx].timestamp!;
             const step = (endTime - startTime) / (gap + 1);

             for (let j = 1; j <= gap; j++) {
                 const targetIdx = startIdx + j;
                 if (!newLines[targetIdx].isSynced) {
                     newLines[targetIdx].timestamp = startTime + (step * j);
                     newLines[targetIdx].isSynced = true; // Mark as synced (though it's estimated)
                     filledCount++;
                 }
             }
         }
     }

     setLines(newLines);
     Alert.alert('Auto-Fill', `Interpolated timestamps for ${filledCount} lines.`);
  };

  const handleSaveInternal = () => {
    // Convert back to string format
    const result = lines.map(line => {
        if (line.timestamp !== undefined) {
             const time = line.timestamp;
             const min = Math.floor(time / 60);
             const sec = (time % 60).toFixed(2);
             const secFormatted = parseFloat(sec) < 10 ? `0${sec}` : sec;
             return `[${min}:${secFormatted}]${line.text}`;
        }
        return line.text;
    }).join('\n');
    
    onSave(result);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
            <View>
                <Text style={styles.title}>Tap to Sync</Text>
                <Text style={styles.subtitle}>Tap a line when it's sung</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 12}}>
                 <Pressable style={styles.autoBtn} onPress={handleAutoFill}>
                    <Ionicons name="flash" size={16} color="#000" />
                    <Text style={styles.autoBtnText}>Auto-Fill</Text>
                 </Pressable>
                 <Pressable onPress={handleSaveInternal} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Done</Text>
                 </Pressable>
            </View>
        </View>

        {/* List */}
        <FlatList
            ref={flatListRef}
            data={lines}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
                <Pressable 
                    style={[
                        styles.lineRow, 
                        activeLineIndex === index && styles.activeRow,
                        item.isSynced && styles.syncedRow
                    ]}
                    onPress={() => handleTapLine(index)}
                    onLongPress={() => clearTimestamp(index)}
                >
                    <View style={styles.timeContainer}>
                        {item.timestamp !== undefined ? (
                            <Text style={[styles.timestamp, activeLineIndex === index && styles.activeTimestamp]}>
                                {formatTime(item.timestamp)}
                            </Text>
                        ) : (
                            <Ionicons name="ellipse-outline" size={12} color="#444" />
                        )}
                    </View>
                    <Text style={[
                        styles.lineText, 
                        activeLineIndex === index && styles.activeText,
                        !item.text && styles.emptyLine
                    ]}>
                        {item.text || '...'}
                    </Text>
                </Pressable>
            )}
        />

        {/* Player Controls */}
        <BlurView intensity={20} tint="dark" style={styles.controls}>
             <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={playerDuration}
                value={positionLocal}
                onSlidingComplete={handleSeek}
                minimumTrackTintColor={Colors.accent}
                maximumTrackTintColor="#555"
                thumbTintColor={Colors.accent}
             />
             
             <View style={styles.buttonsRow}>
                 <Pressable onPress={() => seekTo(Math.max(0, positionLocal - 5))}>
                    <Ionicons name="play-back" size={24} color="#fff" />
                 </Pressable>
                 
                 <Pressable onPress={togglePlay} style={styles.playBtn}>
                    <Ionicons name={isPlayingLocal ? "pause" : "play"} size={32} color="#000" />
                 </Pressable>

                 <Pressable onPress={() => seekTo(Math.min(playerDuration, positionLocal + 5))}>
                    <Ionicons name="play-forward" size={24} color="#fff" />
                 </Pressable>
             </View>
             
             {/* Cancel */}
             <Pressable style={styles.cancelBtn} onPress={onClose}>
                 <Text style={styles.cancelText}>Cancel</Text>
             </Pressable>
        </BlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#181818',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '600',
  },
  autoBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  autoBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 12
  },
  listContent: {
    paddingBottom: 200, // Space for controls
    paddingTop: 10,
  },
  lineRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  activeRow: {
    backgroundColor: 'rgba(62, 166, 255, 0.1)',
  },
  syncedRow: {
    // borderLeftWidth: 3,
    // borderLeftColor: Colors.accent
    backgroundColor: 'rgba(255, 255, 255, 0.02)'
  },
  timeContainer: {
    width: 60,
    alignItems: 'center',
    marginRight: 10,
  },
  timestamp: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  activeTimestamp: {
    fontWeight: 'bold',
  },
  lineText: {
    color: '#aaa',
    fontSize: 16,
    flex: 1,
  },
  activeText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyLine: {
    fontStyle: 'italic',
    opacity: 0.5
  },
  
  // Controls
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(15, 15, 15, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    marginBottom: 20,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 10,
  },
  cancelText: {
    color: '#666',
  }
});

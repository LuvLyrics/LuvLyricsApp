import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useDownloadQueueStore } from '../store/downloadQueueStore';

export const FloatingDownloadIndicator = ({ onPress }: { onPress: () => void }) => {
    const queue = useDownloadQueueStore(state => state.queue);
    
    // Only show if there are active downloads
    const activeDownloads = queue.filter(q => q.status === 'downloading' || q.status === 'staging' || q.status === 'pending');
    
    if (activeDownloads.length === 0) return null;
    
    // Calculate overall progress
    const totalProgress = activeDownloads.reduce((acc, item) => acc + (item.progress || 0), 0);
    const averageProgress = totalProgress / activeDownloads.length;

    // Draggable Logic is complex for a simple component, maybe just fixed for now?
    // User asked for "A draggable or fixed floating bubble". Fixed is safer for MVP.
    // Let's position it bottom right, above TAB bar if exists.

    return (
        <Pressable style={styles.container} onPress={onPress}>
            <View style={styles.bubble}>
                {/* Circular Progress (Simplified as ring border) */}
                <View style={[styles.progressRing, { 
                    borderRightColor: averageProgress > 0.25 ? Colors.primary : 'transparent',
                    borderBottomColor: averageProgress > 0.5 ? Colors.primary : 'transparent',
                    borderLeftColor: averageProgress > 0.75 ? Colors.primary : 'transparent',
                    transform: [{ rotate: '45deg' }] // Hacky CSS ring
                }]} />
                
                {/* Real svg ring would be better but keeping it simple with icons */}
                <Ionicons name="cloud-download" size={24} color="#fff" />
                
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{activeDownloads.length}</Text>
                </View>
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        zIndex: 999,
        elevation: 10,
    },
    bubble: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#333',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    progressRing: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: Colors.primary, 
        // In real app, use SVG for precision
        opacity: 0.5
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: Colors.error,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    }
});

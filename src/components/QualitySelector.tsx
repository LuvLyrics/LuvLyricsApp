import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioOption } from '../hooks/useSongStaging';
import { Colors } from '../constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

interface QualitySelectorProps {
    visible: boolean;
    onClose: () => void;
    options: AudioOption[];
    selected: AudioOption | undefined;
    onSelect: (option: AudioOption) => void;
}

export const QualitySelector = ({ visible, onClose, options, selected, onSelect }: QualitySelectorProps) => {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                
                <View style={styles.sheet}>
                    <LinearGradient
                        colors={['#1F1F1F', '#121212']}
                        style={styles.gradient}
                    >
                        {/* Handle */}
                        <View style={styles.handleContainer}>
                            <View style={styles.handle} />
                        </View>

                        <Text style={styles.title}>Select Audio Quality</Text>
                        <Text style={styles.subtitle}>Higher bitrate = better sound, larger file.</Text>

                        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
                            {options.map((option, idx) => {
                                const isSelected = selected?.url === option.url;
                                return (
                                    <Pressable
                                        key={idx}
                                        style={[
                                            styles.optionRow,
                                            isSelected && styles.selectedRow
                                        ]}
                                        onPress={() => {
                                            onSelect(option);
                                            onClose();
                                        }}
                                    >
                                        <View style={styles.iconContainer}>
                                            <Ionicons 
                                                name={option.bitrate >= 256 ? "musical-notes" : "musical-note-outline"} 
                                                size={24} 
                                                color={isSelected ? '#fff' : Colors.primary} 
                                            />
                                        </View>
                                        
                                        <View style={styles.infoContainer}>
                                            <Text style={[styles.label, isSelected && styles.selectedText]}>
                                                {option.label}
                                            </Text>
                                            <Text style={styles.details}>
                                                {option.format.toUpperCase()} • {option.bitrate}kbps
                                            </Text>
                                        </View>

                                        <View style={styles.sizeBadge}>
                                            <Text style={styles.sizeText}>{option.size} MB</Text>
                                        </View>

                                        {isSelected && (
                                            <View style={styles.checkIcon}>
                                                <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        maxHeight: '60%',
    },
    gradient: {
        padding: 24,
        paddingBottom: 0,
    },
    handleContainer: { alignItems: 'center', marginBottom: 16 },
    handle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
    list: {},
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    selectedRow: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(142, 45, 226, 0.1)',
    },
    iconContainer: {
        width: 40, height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 16
    },
    infoContainer: { flex: 1 },
    label: { fontSize: 16, fontWeight: '600', color: '#fff' },
    selectedText: { color: Colors.primary },
    details: { fontSize: 12, color: '#888', marginTop: 4 },
    sizeBadge: {
        backgroundColor: '#222',
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 6,
        marginRight: 12
    },
    sizeText: { color: '#ccc', fontSize: 12, fontWeight: '600' },
    checkIcon: {},
});

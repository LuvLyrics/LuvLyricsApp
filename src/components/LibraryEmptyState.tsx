import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LibraryEmptyStateProps {
  onAddPress: () => void;
  onDownloadPress: () => void;
  colors: {
    textSecondary: string;
  };
}

const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({ onAddPress, onDownloadPress, colors }) => (
  <View style={styles.emptyContainer}>
    <Ionicons name="musical-notes-outline" size={80} color={colors.textSecondary} />
    <Text style={styles.emptyTitle}>No songs yet</Text>
    <Text style={styles.emptySubtitle}>Add your first song with timestamped lyrics</Text>
    <View style={styles.emptyActionsRow}>
      <Pressable style={styles.addButton} onPress={onAddPress}>
        <Ionicons name="add" size={20} color="#F4F4F5" />
        <Text style={styles.addButtonText}>Add Lyrics</Text>
      </Pressable>
      <Pressable style={styles.downloadButton} onPress={onDownloadPress}>
        <Ionicons name="cloud-download-outline" size={20} color="#EAEAF0" />
        <Text style={styles.downloadButtonText}>Download Music</Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#888888', textAlign: 'center', maxWidth: 250 },
  emptyActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20, flexWrap: 'wrap' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 46,
    minWidth: 150,
  },
  addButtonText: { fontSize: 14, fontWeight: '600', color: '#F4F4F5' },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 46,
    minWidth: 150,
  },
  downloadButtonText: { fontSize: 14, fontWeight: '600', color: '#EAEAF0' },
});

export default React.memo(LibraryEmptyState);

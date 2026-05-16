/**
 * LyricFlow - AI Generator Modal
 * Helper to generate timestamps using ChatGPT
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '../constants/colors';
import { BlurView } from 'expo-blur';

interface AIGeneratorModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (text: string) => void;
}

const AI_PROMPT = `I need you to add timestamps to these lyrics. 
Format requirements:
1. Use [mm:ss] format at the start of each line
2. If there are instrumental breaks, mark them with [mm:ss] [Instrumental]
3. Keep the original line breaks
4. Return ONLY the lyrics with timestamps, no other text

Here are the lyrics:
[PASTE LYRICS HERE]`;

export const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  visible,
  onClose,
  onApply,
}) => {
  const [pastedText, setPastedText] = useState('');

  const handleCopyPrompt = async () => {
    await Clipboard.setStringAsync(AI_PROMPT);
    Alert.alert('Copied!', 'Prompt copied to clipboard. Now paste it into ChatGPT along with your lyrics.');
  };

  const handleApply = () => {
    if (!pastedText.trim()) {
      Alert.alert('Empty', 'Please paste the result from ChatGPT first.');
      return;
    }
    onApply(pastedText);
    setPastedText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint="dark" style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>AI Timestamp Helper</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Step 1 */}
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <Text style={styles.stepTitle}>Copy Prompt</Text>
              </View>
              <Text style={styles.stepDesc}>
                Copy this prompt and paste it into ChatGPT with your lyrics to get perfect timestamps.
              </Text>
              <Pressable style={styles.copyButton} onPress={handleCopyPrompt}>
                <Ionicons name="copy-outline" size={20} color="#000" />
                <Text style={styles.copyButtonText}>Copy Prompt</Text>
              </Pressable>
            </View>

            {/* Step 2 */}
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <Text style={styles.stepTitle}>Paste Result</Text>
              </View>
              <Text style={styles.stepDesc}>
                Paste the timestamped lyrics from ChatGPT here:
              </Text>
              <TextInput
                style={styles.input}
                multiline
                placeholder="[00:12] Hello world..."
                placeholderTextColor={Colors.textMuted}
                value={pastedText}
                onChangeText={setPastedText}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply to Editor</Text>
            </Pressable>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    height: '80%',
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
  },
  step: {
    marginBottom: 32,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  stepDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  copyButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    padding: 16,
    height: 200,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  footer: {
    marginTop: 16,
  },
  applyButton: {
    backgroundColor: Colors.accent,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});

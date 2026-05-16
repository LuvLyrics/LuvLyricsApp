/**
 * Language Preference Modal for Luvs
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLuvsPreferencesStore, LuvLanguage } from '../store/luvsPreferencesStore';
import { Colors } from '../constants/colors';

const AVAILABLE_LANGUAGES: LuvLanguage[] = [
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Punjabi',
  'Korean',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Marathi',
];

interface LanguagePickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguagePickerModal: React.FC<LanguagePickerModalProps> = ({ visible, onClose }) => {
  const { preferredLanguages, setPreferredLanguages } = useLuvsPreferencesStore();
  const [selectedLanguages, setSelectedLanguages] = useState<LuvLanguage[]>(() => 
      preferredLanguages.filter(l => l.weight > 0).map(l => l.language)
  );

  const toggleLanguage = (language: LuvLanguage) => {
    if (selectedLanguages.includes(language)) {
      // Prevent deselecting if it's the last language
      if (selectedLanguages.length === 1) return;
      setSelectedLanguages(selectedLanguages.filter(l => l !== language));
    } else {
      setSelectedLanguages([...selectedLanguages, language]);
    }
  };

  const handleSave = () => {
    setPreferredLanguages(selectedLanguages);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Luvs Language Preferences</Text>
            <Text style={styles.subtitle}>Select languages for your Luvs feed</Text>
          </View>

          {/* Language Options */}
          <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
            {AVAILABLE_LANGUAGES.map((language) => {
              const isSelected = selectedLanguages.includes(language);
              return (
                <Pressable
                  key={language}
                  style={[styles.languageOption, isSelected && styles.languageOptionSelected]}
                  onPress={() => toggleLanguage(language)}
                >
                  <View style={styles.languageRow}>
                    <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
                      {language}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  languageList: {
    maxHeight: 400,
  },
  languageOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageName: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  languageNameSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

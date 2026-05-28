/**
 * LyricFlow - Settings Screen
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Image,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
  PanResponder,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { TabScreenProps } from '../types/navigation';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { CustomAlert } from '../components/CustomAlert';
import { Colors } from '../constants/colors';
import { exportAllSongs, shareExportedFile, importSongsFromJson } from '../utils/exportImport';
import { clearAllData } from '../database/queries';
import { useLuvsPreferencesStore } from '../store/luvsPreferencesStore';
import { useDesktopBridgeSettingsStore } from '../store/desktopBridgeSettingsStore';
import { desktopBridgeService } from '../services/DesktopBridgeService';
import { trustedPairingService, TrustedDesktopRecord } from '../services/TrustedPairingService';
import { useSongsStore } from '../store/songsStore';
import { scanAudioFiles, convertAudioFileToSong } from '../services/mediaScanner';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// ─── Bottom Sheet ────────────────────────────────────────────────────────────

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ visible, title, onClose, children }) => {
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const sheetTranslateY = React.useRef(new Animated.Value(800)).current;
  const panY = React.useRef(new Animated.Value(0)).current;
  const [modalVisible, setModalVisible] = React.useState(false);
  const isClosing = React.useRef(false);

  const closeOnce = React.useCallback(() => {
    if (isClosing.current) return;
    isClosing.current = true;
    onClose();
  }, [onClose]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) panY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          panY.setValue(0);
          closeOnce();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 300 }).start();
        }
      },
    }),
  ).current;

  React.useEffect(() => {
    if (visible) {
      isClosing.current = false;
      panY.setValue(0);
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, damping: 32, stiffness: 220, mass: 1.1 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 800, duration: 220, useNativeDriver: true }),
      ]).start(() => { setModalVisible(false); panY.setValue(0); });
    }
  }, [visible]);

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeOnce} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, bs.backdrop, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeOnce} />
      </Animated.View>
      <Animated.View style={[bs.sheet, { transform: [{ translateY: Animated.add(sheetTranslateY, panY) }] }]} {...panResponder.panHandlers}>
        <View style={bs.handle} />
        <View style={bs.header}>
          <Text style={bs.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={bs.content}>
          {children}
        </ScrollView>
        <View style={bs.sheetFloor} />
      </Animated.View>
    </Modal>
  );
};

const bs = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingBottom: 36,
  },
  sheetFloor: {
    position: 'absolute',
    bottom: -100,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#1C1C1E',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
});

// ─── Luv Languages Modal ──────────────────────────────────────────────────────

const LuvsLanguagesModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { preferredLanguages, updateLanguageWeight } = useLuvsPreferencesStore();
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          width: '90%', maxHeight: '80%', backgroundColor: Colors.card,
          borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary }}>Music Languages</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={{ width: '100%' }}>
            <Text style={{ color: Colors.textSecondary, marginBottom: 16, fontSize: 13 }}>
              Adjust preferences to curate your Luvs feed. Set weight to 0% to disable a language.
            </Text>
            {preferredLanguages.map((item) => (
              <View key={item.language} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, color: Colors.textPrimary, fontWeight: '600' }}>{item.language}</Text>
                  <Text style={{ fontSize: 14, color: Colors.primary, fontWeight: '700' }}>
                    {item.weight === 0 ? 'DISABLED' : `${item.weight}%`}
                  </Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0} maximumValue={100} step={10}
                  value={item.weight}
                  onSlidingComplete={(v) => updateLanguageWeight(item.language, v)}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={Colors.cardHover}
                  thumbTintColor={Colors.primary}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Reusable rows ───────────────────────────────────────────────────────────

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, label, value, onPress, showChevron = true }) => (
  <Pressable style={styles.settingsRow} onPress={onPress}>
    <Ionicons name={icon} size={22} color={Colors.textSecondary} />
    <Text style={styles.settingsLabel}>{label}</Text>
    <View style={styles.settingsValue}>
      {value ? <Text style={styles.settingsValueText}>{value}</Text> : null}
      {showChevron && <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
    </View>
  </Pressable>
);

interface SettingsRowSwitchProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}

const SettingsRowSwitch: React.FC<SettingsRowSwitchProps> = ({ icon, label, value, onToggle }) => (
  <View style={styles.settingsRow}>
    <Ionicons name={icon} size={22} color={Colors.textSecondary} />
    <Text style={styles.settingsLabel}>{label}</Text>
    <Switch value={value} onValueChange={onToggle} trackColor={{ false: '#39393D', true: '#34C759' }} thumbColor="#fff" />
  </View>
);

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  badge?: string;
  onPress: () => void;
  isLast?: boolean;
}

const MenuRow: React.FC<MenuRowProps> = ({ icon, iconColor, label, badge, onPress, isLast }) => (
  <Pressable style={[styles.menuRow, isLast && styles.menuRowLast]} onPress={onPress}>
    <View style={[styles.menuIcon, { backgroundColor: iconColor + '22' }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    <View style={styles.menuRight}>
      {badge ? <Text style={styles.menuBadge}>{badge}</Text> : null}
      <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
    </View>
  </Pressable>
);

// ─── Screen ──────────────────────────────────────────────────────────────────

type Props = TabScreenProps<'Settings'>;

const SettingsScreen: React.FC<Props> = () => {
  const settings = useSettingsStore();
  const { fetchSongs, addSong, songs, deleteSong } = useSongsStore();
  const [isImporting, setIsImporting] = React.useState(false);
  const [profileName, setProfileName] = React.useState('LyricFlow User');
  const [profileImage, setProfileImage] = React.useState<string | null>(null);
  const [editNameVisible, setEditNameVisible] = React.useState(false);
  const [tempName, setTempName] = React.useState('');
  const [selectionModalVisible, setSelectionModalVisible] = React.useState(false);
  const [availableAudioFiles, setAvailableAudioFiles] = React.useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState('');
  const setMiniPlayerHidden = usePlayerStore(state => state.setMiniPlayerHidden);
  const [hiddenSongsVisible, setHiddenSongsVisible] = React.useState(false);
  const { hiddenSongs, fetchHiddenSongs, hideSong: unhideSong } = useSongsStore();
  const [luvsLangModalVisible, setLuvsLangModalVisible] = React.useState(false);
  const { desktopConnectEnabled, allowDesktopDownloads, setDesktopConnectEnabled, setAllowDesktopDownloads } = useDesktopBridgeSettingsStore();
  const [pairingModalVisible, setPairingModalVisible] = React.useState(false);
  const [pairingPayloadText, setPairingPayloadText] = React.useState('');
  const [pairingBusy, setPairingBusy] = React.useState(false);
  const [trustedDesktops, setTrustedDesktops] = React.useState<TrustedDesktopRecord[]>([]);
  const [activeSheet, setActiveSheet] = React.useState<string | null>(null);
  const closeSheet = React.useCallback(() => setActiveSheet(null), []);

  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', message: '', buttons: [] });

  const loadTrustedDesktops = React.useCallback(async () => {
    const all = await trustedPairingService.listTrustedDesktops();
    setTrustedDesktops(all);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      setMiniPlayerHidden(true);
      loadTrustedDesktops().catch(() => undefined);
    }, [setMiniPlayerHidden, loadTrustedDesktops])
  );

  const filteredAudioFiles = React.useMemo(() => {
    if (!searchQuery.trim()) return availableAudioFiles;
    const q = searchQuery.toLowerCase().trim();
    return availableAudioFiles.filter(f =>
      (f.filename || '').toLowerCase().includes(q) ||
      (f.artist || '').toLowerCase().includes(q) ||
      (f.album || '').toLowerCase().includes(q)
    );
  }, [availableAudioFiles, searchQuery]);

  const handlePairFromPayload = async () => {
    if (!pairingPayloadText.trim()) return;
    try {
      setPairingBusy(true);
      await desktopBridgeService.pairFromQrPayload(pairingPayloadText.trim());
      await loadTrustedDesktops();
      setPairingModalVisible(false);
      setPairingPayloadText('');
      setAlertConfig({ visible: true, title: 'Pairing Complete', message: 'Trusted desktop saved.', buttons: [{ text: 'OK', onPress: () => {} }] });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pairing failed';
      setAlertConfig({ visible: true, title: 'Pairing Failed', message, buttons: [{ text: 'OK', onPress: () => {} }] });
    } finally {
      setPairingBusy(false);
    }
  };

  const handleEditName = () => { setTempName(profileName); setEditNameVisible(true); };
  const handleSaveName = () => { if (tempName.trim()) setProfileName(tempName.trim()); setEditNameVisible(false); };

  const handleEditAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (!result.canceled && result.assets[0].uri) setProfileImage(result.assets[0].uri);
    } catch {}
  };

  const handleExport = async () => {
    try { const uri = await exportAllSongs(); await shareExportedFile(uri); }
    catch { Alert.alert('Export Failed', 'Could not export songs.'); }
  };

  const handleImport = async () => {
    try {
      const count = await importSongsFromJson();
      if (count > 0) { Alert.alert('Import Successful', `Imported ${count} songs.`); await fetchSongs(); }
    } catch { Alert.alert('Import Failed', 'Could not import songs.'); }
  };

  const handleClearData = () => {
    setAlertConfig({
      visible: true, title: '⚠️ Clear All Data',
      message: 'This will permanently delete all songs and lyrics. Cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        { text: 'Delete All', style: 'destructive', onPress: async () => {
          try {
            await clearAllData(); await fetchSongs();
            setAlertConfig({ visible: true, title: '✅ Done', message: 'All data cleared.', buttons: [{ text: 'OK', onPress: () => {} }] });
          } catch {
            setAlertConfig({ visible: true, title: '❌ Error', message: 'Failed to clear data.', buttons: [{ text: 'OK', onPress: () => {} }] });
          }
        }},
      ],
    });
  };

  const handleClearImported = async () => {
    const importedSongs = songs.filter(s => s.audioUri);
    if (importedSongs.length === 0) {
      setAlertConfig({ visible: true, title: 'No Imported Songs', message: 'Nothing to remove.', buttons: [{ text: 'OK', onPress: () => {} }] });
      return;
    }
    setAlertConfig({
      visible: true, title: '🗑️ Clear Imported Audio',
      message: `Remove ${importedSongs.length} imported audio files?`,
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        { text: `Remove ${importedSongs.length}`, style: 'destructive', onPress: async () => {
          try {
            for (const s of importedSongs) await deleteSong(s.id);
            setAlertConfig({ visible: true, title: '✅ Removed', message: `Removed ${importedSongs.length} songs.`, buttons: [{ text: 'Done', onPress: () => {} }] });
          } catch {
            setAlertConfig({ visible: true, title: '❌ Error', message: 'Failed to remove.', buttons: [{ text: 'OK', onPress: () => {} }] });
          }
        }},
      ],
    });
  };

  const handleImportLocalAudio = async () => {
    try {
      setIsImporting(true);
      const audioFiles = await scanAudioFiles();
      if (audioFiles.length === 0) { Alert.alert('No Audio Files', 'No audio files found.'); setIsImporting(false); return; }
      const existingUris = new Set(songs.filter(s => s.audioUri).map(s => s.audioUri));
      const newFiles = audioFiles.filter(f => !existingUris.has(f.uri));
      if (newFiles.length === 0) {
        setAlertConfig({ visible: true, title: 'Already Imported', message: 'All audio files already imported.', buttons: [{ text: 'OK', onPress: () => setIsImporting(false) }] });
        return;
      }
      setIsImporting(false);
      setAvailableAudioFiles(newFiles);
      setSelectedFiles(new Set());
      setSearchQuery('');
      setSelectionModalVisible(true);
    } catch {
      setIsImporting(false);
      Alert.alert('Import Failed', 'Could not access media library.');
    }
  };

  const handleImportSelected = async () => {
    setSelectionModalVisible(false);
    setIsImporting(true);
    let imported = 0;
    for (const f of availableAudioFiles) {
      if (selectedFiles.has(f.uri)) {
        try { await addSong(convertAudioFileToSong(f)); imported++; } catch {}
      }
    }
    setIsImporting(false);
    setAlertConfig({ visible: true, title: '✅ Import Complete', message: `Imported ${imported} of ${selectedFiles.size} songs.`, buttons: [{ text: 'Done', onPress: () => {} }] });
  };

  const toggleSelectAll = () => {
    setSelectedFiles(selectedFiles.size === availableAudioFiles.length ? new Set() : new Set(availableAudioFiles.map(f => f.uri)));
  };

  const handleCloseSelectionModal = () => { setSelectionModalVisible(false); setSearchQuery(''); };

  const toggleFileSelection = (uri: string) => {
    const next = new Set(selectedFiles);
    next.has(uri) ? next.delete(uri) : next.add(uri);
    setSelectedFiles(next);
  };

  const handleSetDownloadLocation = async () => {
    if (Platform.OS !== 'android') { Alert.alert('Not Available', 'Custom folders are Android-only.'); return; }
    try {
      const p = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (p.granted) { settings.setDownloadDirectory(p.directoryUri); Alert.alert('Success', 'Download location updated.'); }
    } catch { Alert.alert('Error', 'Failed to set download location.'); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>

          {/* Profile */}
          <View style={styles.profileSection}>
            <Pressable style={styles.avatar} onPress={handleEditAvatar}>
              {profileImage
                ? <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                : <Ionicons name="person" size={40} color={Colors.textSecondary} />}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color="#000" />
              </View>
            </Pressable>
            <Pressable onPress={handleEditName}>
              <View style={styles.nameContainer}>
                <Text style={styles.profileName}>{profileName}</Text>
                <Ionicons name="create-outline" size={16} color={Colors.textSecondary} style={{ marginLeft: 6 }} />
              </View>
            </Pressable>
            <Text style={styles.profileEmail}>Offline Mode · Privacy First</Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Pressable style={styles.quickAction} onPress={handleExport}>
              <Ionicons name="download-outline" size={26} color="#A78BFA" />
              <Text style={styles.quickActionText}>Export</Text>
            </Pressable>
            <Pressable style={styles.quickAction} onPress={handleImport}>
              <Ionicons name="cloud-upload-outline" size={26} color="#F472B6" />
              <Text style={styles.quickActionText}>Import</Text>
            </Pressable>
            <Pressable style={styles.quickAction}>
              <Ionicons name="time-outline" size={26} color="#60A5FA" />
              <Text style={styles.quickActionText}>History</Text>
            </Pressable>
          </View>

          {/* Menu List */}
          <View style={styles.menuList}>
            <MenuRow icon="moon-outline" iconColor="#A78BFA" label="Appearance" onPress={() => setActiveSheet('appearance')} />
            <MenuRow icon="play-circle-outline" iconColor="#34C759" label="Playback" onPress={() => setActiveSheet('playback')} />
            <MenuRow icon="folder-open-outline" iconColor="#FF9F0A" label="Library" onPress={() => setActiveSheet('library')} />
            <MenuRow icon="globe-outline" iconColor="#30D158" label="Discovery" onPress={() => setActiveSheet('discovery')} />
            <MenuRow
              icon="desktop-outline" iconColor="#0A84FF" label="Desktop Connect"
              badge={desktopConnectEnabled ? 'On' : 'Off'}
              onPress={() => setActiveSheet('desktop')}
            />
            <MenuRow icon="trash-outline" iconColor="#FF453A" label="Data" onPress={() => setActiveSheet('data')} />
            <MenuRow icon="information-circle-outline" iconColor="#636366" label="About" onPress={() => setActiveSheet('about')} isLast />
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* ── Bottom Sheets ───────────────────────────────────────────────────── */}

      <BottomSheet visible={activeSheet === 'appearance'} title="Appearance" onClose={closeSheet}>
        <SettingsRow icon="moon-outline" label="App Theme" value="Dark" onPress={() => {}} />
        <SettingsRow
          icon="text-outline" label="Lyrics Size"
          value={settings.lyricsFontSize.charAt(0).toUpperCase() + settings.lyricsFontSize.slice(1)}
          onPress={() => {}}
        />
        <SettingsRowSwitch icon="speedometer-outline" label="Show FPS Counter" value={settings.showPerformanceHUD} onToggle={settings.setShowPerformanceHUD} />
      </BottomSheet>

      <BottomSheet visible={activeSheet === 'playback'} title="Playback" onClose={closeSheet}>
        <SettingsRowSwitch icon="play-outline" label="Auto-Scroll Lyrics" value={true} onToggle={() => {}} />
        <SettingsRowSwitch icon="musical-note-outline" label="Play in Mini Player Only" value={settings.playInMiniPlayerOnly} onToggle={settings.setPlayInMiniPlayerOnly} />
        {settings.navBarStyle === 'classic' && (
          <SettingsRow
            icon="layers-outline" label="Mini Player Style"
            value={settings.miniPlayerStyle === 'island' ? 'Dynamic Island' : 'Classic Bar'}
            onPress={() => settings.setMiniPlayerStyle(settings.miniPlayerStyle === 'island' ? 'bar' : 'island')}
          />
        )}
        <SettingsRow
          icon="navigate-outline" label="Navigation Bar Style"
          value={settings.navBarStyle === 'modern-pill' ? 'Modern Pill' : 'Classic'}
          onPress={() => {
            const next = settings.navBarStyle === 'modern-pill' ? 'classic' : 'modern-pill';
            settings.setNavBarStyle(next);
            if (next === 'modern-pill') settings.setMiniPlayerStyle('island');
          }}
        />
        <SettingsRowSwitch icon="sunny-outline" label="Keep Screen On" value={settings.keepScreenOn} onToggle={settings.setKeepScreenOn} />
        <View style={styles.sliderRow}>
          <View style={styles.sliderHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="timer-outline" size={20} color={Colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={styles.sliderLabel}>Lyrics Delay</Text>
            </View>
            <Text style={styles.sliderValue}>{settings.lyricsDelay.toFixed(1)}s</Text>
          </View>
          <Slider
            style={{ width: '100%', height: 36 }}
            minimumValue={-5.0} maximumValue={5.0} step={0.1}
            value={settings.lyricsDelay}
            onSlidingComplete={settings.setLyricsDelay}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.cardHover}
            thumbTintColor={Colors.primary}
          />
          <Text style={styles.sliderHint}>Negative = lyrics arrive late · Positive = early</Text>
        </View>
      </BottomSheet>

      <BottomSheet visible={activeSheet === 'library'} title="Library" onClose={closeSheet}>
        <SettingsRow
          icon="folder-outline"
          label={isImporting ? 'Importing…' : 'Import Local Audio'}
          value={isImporting ? '' : 'Tap to scan'}
          onPress={handleImportLocalAudio}
        />
        <SettingsRow
          icon="color-palette-outline" label="Background Theme"
          value={
            settings.libraryBackgroundMode === 'daily' ? 'Most Played Yesterday' :
            settings.libraryBackgroundMode === 'current' ? 'Current Song' :
            settings.libraryBackgroundMode === 'black' ? 'Pure Black' :
            settings.libraryBackgroundMode === 'grey' ? 'Spotify Grey' : 'Aurora'
          }
          onPress={() => {
            const modes: ('daily' | 'current' | 'aurora' | 'black' | 'grey')[] = ['daily', 'current', 'aurora', 'black', 'grey'];
            const next = modes[(modes.indexOf(settings.libraryBackgroundMode) + 1) % modes.length];
            settings.setLibraryBackgroundMode(next);
          }}
        />
        <SettingsRow
          icon="eye-off-outline" label="Hidden Songs"
          value={hiddenSongs.length > 0 ? `${hiddenSongs.length} songs` : 'None'}
          onPress={() => { fetchHiddenSongs(); setHiddenSongsVisible(true); }}
        />
        <SettingsRow
          icon="save-outline" label="Download Location"
          value={settings.downloadDirectoryUri ? 'Custom Folder' : 'Default'}
          onPress={handleSetDownloadLocation}
        />
      </BottomSheet>

      <BottomSheet visible={activeSheet === 'discovery'} title="Discovery" onClose={closeSheet}>
        <SettingsRow icon="language-outline" label="Music Languages" value="Configure Weights" onPress={() => { closeSheet(); setLuvsLangModalVisible(true); }} />
      </BottomSheet>

      <BottomSheet visible={activeSheet === 'desktop'} title="Desktop Connect" onClose={closeSheet}>
        <SettingsRowSwitch icon="power-outline" label="Enable Desktop Connect" value={desktopConnectEnabled} onToggle={setDesktopConnectEnabled} />
        <SettingsRow
          icon="qr-code-outline" label="Trusted Pairing"
          value={trustedDesktops.length > 0 ? `${trustedDesktops.length} trusted` : 'Not paired'}
          onPress={() => setPairingModalVisible(true)}
        />
        <SettingsRowSwitch icon="cloud-download-outline" label="Allow Desktop Downloads" value={allowDesktopDownloads} onToggle={setAllowDesktopDownloads} />
      </BottomSheet>

      <BottomSheet visible={activeSheet === 'data'} title="Data" onClose={closeSheet}>
        <SettingsRow icon="close-circle-outline" label="Clear Imported Audio" onPress={handleClearImported} />
        <SettingsRow icon="trash-outline" label="Clear All Data" onPress={handleClearData} />
      </BottomSheet>

      <BottomSheet visible={activeSheet === 'about'} title="About" onClose={closeSheet}>
        <SettingsRow icon="information-circle-outline" label="Version" value="1.0.0" showChevron={false} />
        <SettingsRow icon="shield-outline" label="Privacy Policy" onPress={() => {}} />
      </BottomSheet>

      {/* ── Alerts & Utility Modals ──────────────────────────────────────────── */}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />

      <Modal visible={editNameVisible} transparent animationType="fade" onRequestClose={() => setEditNameVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditNameVisible(false)}>
          <View style={styles.nameModal}>
            <Text style={styles.nameModalTitle}>Edit Name</Text>
            <TextInput
              style={styles.nameInput} value={tempName} onChangeText={setTempName}
              placeholder="Enter your name" placeholderTextColor="rgba(255,255,255,0.3)" autoFocus
            />
            <View style={styles.nameModalButtons}>
              <Pressable style={styles.nameModalButton} onPress={() => setEditNameVisible(false)}>
                <Text style={styles.nameModalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.nameModalButton, styles.nameModalButtonPrimary]} onPress={handleSaveName}>
                <Text style={[styles.nameModalButtonText, styles.nameModalButtonTextPrimary]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={selectionModalVisible} transparent animationType="slide" onRequestClose={handleCloseSelectionModal}>
        <Pressable style={styles.selectionOverlay} onPress={handleCloseSelectionModal}>
          <Pressable style={styles.selectionContainer} onPress={e => e.stopPropagation()}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Select Songs ({selectedFiles.size}/{availableAudioFiles.length})</Text>
              <Pressable onPress={handleCloseSelectionModal}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={18} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchBarInput} placeholder="Search songs…" placeholderTextColor={Colors.textMuted}
                value={searchQuery} onChangeText={setSearchQuery} autoCapitalize="none" autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
                </Pressable>
              )}
            </View>
            <Pressable style={styles.selectAllButton} onPress={toggleSelectAll}>
              <Ionicons name={selectedFiles.size === availableAudioFiles.length ? 'checkbox' : 'square-outline'} size={24} color="#007AFF" />
              <Text style={styles.selectAllText}>Select All</Text>
            </Pressable>
            <ScrollView style={styles.selectionList} keyboardShouldPersistTaps="handled">
              {filteredAudioFiles.length === 0 && searchQuery.trim() !== '' ? (
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptySearchText}>No songs match "{searchQuery}"</Text>
                </View>
              ) : (
                filteredAudioFiles.map(file => (
                  <Pressable key={file.uri} style={styles.selectionItem} onPress={() => toggleFileSelection(file.uri)}>
                    <Ionicons name={selectedFiles.has(file.uri) ? 'checkbox' : 'square-outline'} size={24} color={selectedFiles.has(file.uri) ? '#007AFF' : Colors.textSecondary} />
                    <View style={styles.selectionItemInfo}>
                      <Text style={styles.selectionItemTitle} numberOfLines={1}>{file.filename.replace(/\.[^/.]+$/, '')}</Text>
                      <Text style={styles.selectionItemArtist} numberOfLines={1}>{file.artist || file.album || 'Unknown'}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <View style={styles.selectionActions}>
              <Pressable style={[styles.selectionButton, styles.selectionButtonCancel]} onPress={handleCloseSelectionModal}>
                <Text style={styles.selectionButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.selectionButton, styles.selectionButtonImport, selectedFiles.size === 0 && styles.selectionButtonDisabled]}
                onPress={handleImportSelected} disabled={selectedFiles.size === 0}
              >
                <Text style={[styles.selectionButtonText, styles.selectionButtonTextImport]}>Import {selectedFiles.size}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={pairingModalVisible} transparent animationType="slide" onRequestClose={() => setPairingModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPairingModalVisible(false)}>
          <Pressable style={styles.nameModal} onPress={e => e.stopPropagation()}>
            <Text style={styles.nameModalTitle}>Trusted Pairing</Text>
            <Text style={styles.pairingHint}>Scan the desktop QR and paste its JSON payload here.</Text>
            <TextInput
              style={styles.pairingInput} value={pairingPayloadText} onChangeText={setPairingPayloadText}
              multiline autoCapitalize="none" autoCorrect={false}
              placeholder="Paste QR payload JSON" placeholderTextColor="rgba(255,255,255,0.35)"
            />
            <View style={styles.nameModalButtons}>
              <Pressable style={styles.nameModalButton} onPress={() => setPairingModalVisible(false)}>
                <Text style={styles.nameModalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.nameModalButton, styles.nameModalButtonPrimary]} onPress={handlePairFromPayload} disabled={pairingBusy}>
                <Text style={[styles.nameModalButtonText, styles.nameModalButtonTextPrimary]}>{pairingBusy ? 'Pairing…' : 'Pair'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={hiddenSongsVisible} transparent animationType="slide" onRequestClose={() => setHiddenSongsVisible(false)}>
        <Pressable style={styles.selectionOverlay} onPress={() => setHiddenSongsVisible(false)}>
          <Pressable style={styles.selectionContainer} onPress={e => e.stopPropagation()}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Hidden Songs ({hiddenSongs.length})</Text>
              <Pressable onPress={() => setHiddenSongsVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView style={[styles.selectionList, { maxHeight: 500 }]} keyboardShouldPersistTaps="handled">
              {hiddenSongs.length === 0 ? (
                <View style={styles.emptySearchContainer}>
                  <Ionicons name="eye-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptySearchText}>No hidden songs</Text>
                </View>
              ) : (
                hiddenSongs.map(song => (
                  <View key={song.id} style={styles.selectionItem}>
                    {song.coverImageUri
                      ? <Image source={{ uri: song.coverImageUri }} style={{ width: 44, height: 44, borderRadius: 8 }} />
                      : <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#2C2C2E', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="disc" size={24} color="rgba(255,255,255,0.3)" />
                        </View>
                    }
                    <View style={styles.selectionItemInfo}>
                      <Text style={styles.selectionItemTitle} numberOfLines={1}>{song.title}</Text>
                      <Text style={styles.selectionItemArtist} numberOfLines={1}>{song.artist || 'Unknown Artist'}</Text>
                    </View>
                    <Pressable
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(0,122,255,0.1)' }}
                      onPress={() => unhideSong(song.id, false)}
                    >
                      <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Unhide</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.selectionActions}>
              <Pressable style={[styles.selectionButton, styles.selectionButtonCancel, { flex: 1 }]} onPress={() => setHiddenSongsVisible(false)}>
                <Text style={styles.selectionButtonText}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <LuvsLanguagesModal visible={luvsLangModalVisible} onClose={() => setLuvsLangModalVisible(false)} />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 100 },

  // Profile
  profileSection: { alignItems: 'center', marginTop: 24, marginBottom: 28 },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    position: 'relative', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 42 },
  editBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 28, height: 28,
    borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  nameContainer: { flexDirection: 'row', alignItems: 'center' },
  profileName: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },

  // Quick Actions
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  quickAction: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 18,
    padding: 16, alignItems: 'center', justifyContent: 'center',
    height: 96, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  quickActionText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },

  // Menu List
  menuList: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', gap: 14,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBadge: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  // Settings rows (inside sheets)
  settingsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)', gap: 14,
  },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  settingsValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settingsValueText: { fontSize: 14, color: Colors.textSecondary },

  // Slider row
  sliderRow: { paddingTop: 14, paddingBottom: 4 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  sliderLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  sliderValue: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  sliderHint: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  nameModal: { backgroundColor: '#1C1C1E', borderRadius: 16, padding: 24, width: '80%', maxWidth: 320 },
  nameModalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16, textAlign: 'center' },
  nameInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, fontSize: 15, color: Colors.textPrimary, marginBottom: 18 },
  nameModalButtons: { flexDirection: 'row', gap: 10 },
  nameModalButton: { flex: 1, padding: 13, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  nameModalButtonPrimary: { backgroundColor: '#007AFF' },
  nameModalButtonText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  nameModalButtonTextPrimary: { color: '#fff' },
  pairingHint: { color: Colors.textSecondary, fontSize: 13, marginBottom: 10 },
  pairingInput: {
    minHeight: 100, maxHeight: 180, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)', color: Colors.textPrimary,
    padding: 10, textAlignVertical: 'top', marginBottom: 12,
  },

  // Selection modal
  selectionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  selectionContainer: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 40 },
  selectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  selectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  searchBarInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  emptySearchContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  emptySearchText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  selectAllButton: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  selectAllText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
  selectionList: { maxHeight: 400 },
  selectionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  selectionItemInfo: { flex: 1 },
  selectionItemTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  selectionItemArtist: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  selectionActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 18 },
  selectionButton: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  selectionButtonCancel: { backgroundColor: 'rgba(255,255,255,0.1)' },
  selectionButtonImport: { backgroundColor: '#007AFF' },
  selectionButtonDisabled: { backgroundColor: 'rgba(0,122,255,0.3)' },
  selectionButtonText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  selectionButtonTextImport: { color: '#fff' },
});

export default SettingsScreen;

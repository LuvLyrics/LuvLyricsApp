import { Platform } from 'react-native';

let MainPlayerModule: any = null;
let eventEmitter: any = null;

if (Platform.OS === 'android') {
  try {
    const { requireNativeModule, EventEmitter } = require('expo-modules-core');
    MainPlayerModule = requireNativeModule('MainPlayer');
    eventEmitter = new EventEmitter(MainPlayerModule);
  } catch (e) {
    console.error('[NativeAudioPlayer] Failed to load native module:', e);
  }
}

export interface PlaybackStatus {
  position: number;
  duration: number;
  isPlaying: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
}

export interface RemoteCommandEvent {
  command: 'next' | 'previous' | 'play' | 'pause';
}

export const NativeAudioPlayer = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && MainPlayerModule !== null;
  },

  async load(uri: string, metadata: { title: string; artist: string; album: string; artworkUri: string }) {
    if (!this.isAvailable()) return;
    return await MainPlayerModule.load(uri, metadata);
  },

  play() {
    if (!this.isAvailable()) return;
    MainPlayerModule.play();
  },

  pause() {
    if (!this.isAvailable()) return;
    MainPlayerModule.pause();
  },

  seekTo(seconds: number) {
    if (!this.isAvailable()) return;
    MainPlayerModule.seekTo(seconds);
  },

  updateMetadata(metadata: { title: string; artist: string; album: string; artworkUri: string }) {
    if (!this.isAvailable()) return;
    MainPlayerModule.updateMetadata(metadata);
  },

  destroy() {
    if (!this.isAvailable()) return;
    MainPlayerModule.destroy();
  },

  addListener(eventName: 'onPlaybackStatus' | 'onRemoteCommand', callback: (data: any) => void) {
    if (!this.isAvailable() || !eventEmitter) {
      return { remove: () => {} };
    }
    return eventEmitter.addListener(eventName, callback);
  }
};

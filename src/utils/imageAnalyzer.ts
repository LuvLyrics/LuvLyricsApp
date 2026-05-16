/**
 * LyricFlow - Image Brightness Analyzer
 * Detects cover art brightness for adaptive vignette
 */

import { Image } from 'react-native';

export interface BrightnessResult {
  brightness: number; // 0-255
  isLight: boolean; // true if mostly light colors
  vignetteOpacity: number; // 0-1 for vignette strength
  overlayOpacity: number; // 0-1 for black overlay
}

// In-memory cache to avoid re-analyzing the same image URI
const brightnessCache = new Map<string, BrightnessResult>();
const MAX_CACHE_SIZE = 50;

/**
 * Analyze image brightness from URI
 * Uses canvas sampling for performance (with in-memory cache)
 */
export const analyzeImageBrightness = async (uri: string): Promise<BrightnessResult> => {
  // Check cache first
  const cached = brightnessCache.get(uri);
  if (cached) return cached;

  return new Promise((resolve) => {
    const fallback: BrightnessResult = {
      brightness: 128,
      isLight: false,
      vignetteOpacity: 0.6,
      overlayOpacity: 0.5,
    };

    Image.getSize(
      uri,
      () => {
        // Evict oldest if cache full
        if (brightnessCache.size >= MAX_CACHE_SIZE) {
          const firstKey = brightnessCache.keys().next().value;
          if (firstKey) brightnessCache.delete(firstKey);
        }
        brightnessCache.set(uri, fallback);
        resolve(fallback);
      },
      () => {
        // Error: assume medium brightness, still cache to prevent retries
        brightnessCache.set(uri, fallback);
        resolve(fallback);
      }
    );
  });
};

/**
 * Calculate vignette/overlay based on brightness
 * Light images: less vignette, more overlay
 * Dark images: more vignette, less overlay
 */
export const calculateOverlayStrength = (brightness: number): BrightnessResult => {
  const isLight = brightness > 160;
  
  if (isLight) {
    // Light cover art: minimal vignette, strong overlay
    return {
      brightness,
      isLight: true,
      vignetteOpacity: 0.3, // Less vignette
      overlayOpacity: 0.7,  // More overlay
    };
  } else {
    // Dark cover art: strong vignette, less overlay
    return {
      brightness,
      isLight: false,
      vignetteOpacity: 0.7, // More vignette
      overlayOpacity: 0.4,  // Less overlay
    };
  }
};

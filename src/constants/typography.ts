/**
 * LyricFlow - Typography Constants
 */

export const Typography = {
  // Font families (using system fonts, can be replaced with custom)
  fontFamily: {
    display: 'System',    // SF Pro Display on iOS, Roboto on Android
    body: 'System',       // SF Pro Text on iOS, Roboto on Android
  },
  
  // Font sizes
  fontSize: {
    // Display sizes
    displayLarge: 42,
    displayMedium: 36,
    displaySmall: 32,
    
    // Heading sizes
    h1: 28,
    h2: 24,
    h3: 20,
    
    // Body sizes
    bodyLarge: 18,
    body: 16,
    bodySmall: 14,
    
    // Caption
    caption: 12,
    tiny: 10,
    
    // Lyrics specific
    lyricCurrent: 34,      // Current line
    lyricOther: 24,        // Previous/upcoming lines
    lyricLarge: 42,        // Large mode setting
  },
  
  // Font weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    lyrics: 2.0,           // Generous line height for lyrics
  },
} as const;

// Preset text styles
export const TextStyles = {
  // Titles
  screenTitle: {
    fontSize: Typography.fontSize.h1,
    fontWeight: Typography.fontWeight.bold,
  },
  cardTitle: {
    fontSize: Typography.fontSize.bodyLarge,
    fontWeight: Typography.fontWeight.bold,
  },
  
  // Body
  body: {
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.regular,
  },
  bodySmall: {
    fontSize: Typography.fontSize.bodySmall,
    fontWeight: Typography.fontWeight.regular,
  },
  
  // Lyrics
  lyricCurrent: {
    fontSize: Typography.fontSize.lyricCurrent,
    fontWeight: Typography.fontWeight.bold,
  },
  lyricOther: {
    fontSize: Typography.fontSize.lyricOther,
    fontWeight: Typography.fontWeight.medium,
  },
} as const;

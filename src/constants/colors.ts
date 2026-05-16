/**
 * LyricFlow - Color Constants
 * Design System based on PRD specifications
 */

export const Colors = {
  // Backgrounds
  background: '#000000',       // True Black
  card: '#1C1C1E',            // Dark Gray
  cardHover: '#2C2C2E',       // Slightly lighter
  
  // Text
  textPrimary: '#FFFFFF',     // White
  textSecondary: '#AAAAAA',   // Light Gray
  textMuted: '#666666',       // Muted gray
  
  // Accents
  accent: '#7f13ec',          // Purple
  primary: '#7f13ec',         // Primary (Purple)
  accentBlue: '#3EA6FF',      // Blue alternative
  
  // Dividers & Borders
  divider: '#2C2C2E',
  border: '#3A3A3C',
  
  // Lyrics specific
  lyricCurrent: '#FFFFFF',    // Current line - bright white
  lyricPrevious: 'rgba(255, 255, 255, 0.25)', // Previous - 25% opacity
  lyricUpcoming: 'rgba(255, 255, 255, 0.35)', // Upcoming - 35% opacity
  
  // Feedback
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  backdrop: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorKey = keyof typeof Colors;

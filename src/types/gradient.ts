/**
 * LyricFlow - Gradient Type Definitions
 */

export interface Gradient {
  id: string;
  name: string;
  colors: string[]; // Array of hex colors
  type: 'linear' | 'radial';
  angle?: number; // For linear gradients (in degrees)
}

export type GradientId = 
  | 'midnight'
  | 'ocean'
  | 'sunset'
  | 'forest'
  | 'fire'
  | 'aurora'
  | 'neon'
  | 'pastel'
  | 'royal'
  | 'cherry'
  | 'mint'
  | 'lavender'
  | 'golden'
  | 'cosmic'
  | 'ember'
  | 'arctic'
  | 'tropical'
  | 'velvet'
  | 'steel'
  | 'rose'
  | 'jade'
  | 'amethyst'
  | 'copper'
  | 'nebula';

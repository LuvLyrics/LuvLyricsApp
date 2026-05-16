/**
 * LyricFlow - All 24 Gradient Definitions
 * Beautiful gradient presets for song backgrounds
 */

import { Gradient } from '../types/gradient';

export const GRADIENTS: Gradient[] = [
  {
    id: 'dynamic',
    name: 'Dynamic (Cover Art)',
    colors: ['#333', '#000'], // Placeholder, will be replaced by image
    type: 'linear',
    angle: 0,
  },
  {
    id: 'midnight',
    name: 'Midnight Dreams',
    colors: ['#0F0C29', '#302B63', '#24243E'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    colors: ['#667eea', '#764ba2', '#f093fb'],
    type: 'linear',
    angle: 180,
  },
  {
    id: 'sunset',
    name: 'Sunset Vibes',
    colors: ['#fa709a', '#fee140', '#ff6a00'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'forest',
    name: 'Forest Mist',
    colors: ['#134E5E', '#71B280', '#0F3443'],
    type: 'linear',
    angle: 160,
  },
  {
    id: 'fire',
    name: 'Fire Glow',
    colors: ['#f12711', '#f5af19', '#ff6b6b'],
    type: 'linear',
    angle: 45,
  },
  {
    id: 'aurora',
    name: 'Aurora Borealis',
    colors: ['#4A0E4E', '#81194E', '#2E2E66'],
    type: 'radial',
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    colors: ['#6a11cb', '#2575fc', '#ff006e'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'pastel',
    name: 'Pastel Dream',
    colors: ['#ffecd2', '#fcb69f', '#ff9a9e'],
    type: 'linear',
    angle: 90,
  },
  {
    id: 'royal',
    name: 'Royal Purple',
    colors: ['#360033', '#0b8793', '#360033'],
    type: 'linear',
    angle: 180,
  },
  {
    id: 'cherry',
    name: 'Cherry Blossom',
    colors: ['#eb3349', '#f45c43', '#ff8177'],
    type: 'linear',
    angle: 120,
  },
  {
    id: 'mint',
    name: 'Mint Fresh',
    colors: ['#00b09b', '#96c93d', '#0BAB64'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'lavender',
    name: 'Lavender Sky',
    colors: ['#a8edea', '#fed6e3', '#7f7fd5'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    colors: ['#f7971e', '#ffd200', '#ff6b35'],
    type: 'linear',
    angle: 45,
  },
  {
    id: 'cosmic',
    name: 'Cosmic Journey',
    colors: ['#5433ff', '#20bdff', '#a5fecb'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'ember',
    name: 'Ember Glow',
    colors: ['#22090c', '#6b0f1a', '#b91372'],
    type: 'linear',
    angle: 180,
  },
  {
    id: 'arctic',
    name: 'Arctic Frost',
    colors: ['#0f2027', '#203a43', '#2c5364'],
    type: 'linear',
    angle: 160,
  },
  {
    id: 'tropical',
    name: 'Tropical Paradise',
    colors: ['#f857a6', '#ff5858', '#feca57'],
    type: 'linear',
    angle: 90,
  },
  {
    id: 'velvet',
    name: 'Velvet Night',
    colors: ['#4b134f', '#c94b4b', '#8e2de2'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'steel',
    name: 'Steel Blue',
    colors: ['#485563', '#29323c', '#667db6'],
    type: 'linear',
    angle: 180,
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    colors: ['#d4145a', '#fbb03b', '#ff6b9d'],
    type: 'linear',
    angle: 120,
  },
  {
    id: 'jade',
    name: 'Jade Garden',
    colors: ['#11998e', '#38ef7d', '#06beb6'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'amethyst',
    name: 'Amethyst Crystal',
    colors: ['#9d50bb', '#6e48aa', '#d946ef'],
    type: 'linear',
    angle: 180,
  },
  {
    id: 'copper',
    name: 'Copper Sunset',
    colors: ['#b79891', '#94716b', '#ff7e5f'],
    type: 'linear',
    angle: 135,
  },
  {
    id: 'nebula',
    name: 'Nebula Storm',
    colors: ['#1e0338', '#833ab4', '#fd1d1d', '#fcb045'],
    type: 'linear',
    angle: 135,
  },
];

// Default gradient for new songs
export const DEFAULT_GRADIENT_ID = 'dynamic';

// Helper to get gradient by ID
export const getGradientById = (id: string): Gradient | undefined => {
  return GRADIENTS.find((g) => g.id === id);
};

// Helper to get gradient colors by ID
export const getGradientColors = (id: string): string[] => {
  const gradient = getGradientById(id);
  return gradient?.colors ?? GRADIENTS[0].colors;
};

// Start from Random index to avoid bias if IDs are sequential? No, simple hash.
export const getGradientForSong = (song: { id: string; gradientId?: string }): string[] => {
    // If specific gradient is set (and not the 'dynamic' placeholder), use it.
    if (song.gradientId && song.gradientId !== 'dynamic' && getGradientById(song.gradientId)) {
        return getGradientColors(song.gradientId);
    }
    
    // Otherwise, generate one deterministically from Song ID
    // Sum char codes to get integer
    let hash = 0;
    for (let i = 0; i < song.id.length; i++) {
        hash = song.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Skip index 0 ('dynamic' / black)
    // Use modulo to pick from 1 to LENGTH-1
    const index = (Math.abs(hash) % (GRADIENTS.length - 1)) + 1;
    return GRADIENTS[index].colors;
};

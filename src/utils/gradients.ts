/**
 * LyricFlow - Gradient Utilities
 */

import { GRADIENTS, getGradientById } from '../constants/gradients';
import { Gradient } from '../types/gradient';

/**
 * Get a random gradient for quick assignment
 */
export const getRandomGradient = (): Gradient => {
  const randomIndex = Math.floor(Math.random() * GRADIENTS.length);
  return GRADIENTS[randomIndex];
};

/**
 * Get gradient prop for LinearGradient component
 */
export const getGradientProps = (gradientId: string) => {
  const gradient = getGradientById(gradientId) || GRADIENTS[0];
  
  // Convert angle to start/end points
  const angleToPoints = (angle: number = 135) => {
    const radians = (angle * Math.PI) / 180;
    return {
      start: { x: 0, y: 0 },
      end: { 
        x: Math.cos(radians), 
        y: Math.sin(radians) 
      },
    };
  };
  
  return {
    colors: gradient.colors,
    ...angleToPoints(gradient.angle),
  };
};

/**
 * Get dominant color from gradient (first color) for status bar/UI accents
 */
export const getDominantColor = (gradientId: string): string => {
  const gradient = getGradientById(gradientId);
  return gradient?.colors[0] ?? '#000000';
};

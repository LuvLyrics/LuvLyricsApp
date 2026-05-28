import { create } from 'zustand';

interface PositionState {
  position: number;
  duration: number;
  updateProgress: (position: number, duration: number) => void;
}

export const usePositionStore = create<PositionState>((set) => ({
  position: 0,
  duration: 0,
  updateProgress: (position, duration) => set({ position, duration }),
}));

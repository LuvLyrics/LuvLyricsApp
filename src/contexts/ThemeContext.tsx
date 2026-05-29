import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { DarkColors, LightColors, AppColors } from '../constants/colors';

interface ThemeContextValue {
  colors: AppColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ colors: DarkColors, isDark: true });

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const resolved = theme === 'auto' ? (systemScheme === 'light' ? 'light' : 'dark') : theme;
  const isDark = resolved !== 'light';
  const colors = isDark ? DarkColors : LightColors;

  return <ThemeContext.Provider value={{ colors, isDark }}>{children}</ThemeContext.Provider>;
};

export const useThemeColors = (): AppColors => useContext(ThemeContext).colors;
export const useIsDark = (): boolean => useContext(ThemeContext).isDark;

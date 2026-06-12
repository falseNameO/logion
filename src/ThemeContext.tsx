/**
 * ThemeContext — provides the active color palette to any component via useTheme().
 *
 * The active theme is driven by settingsStore.darkMode:
 *   darkMode = false  → LightColors (parchment / cream)
 *   darkMode = true   → Colors (default deep navy)  [the default app look]
 *
 * This is intentionally lightweight: only components that need theming import it.
 * Screens that are always dark (e.g. scope pickers) can keep hardcoded values.
 */

import React, { createContext, useContext } from 'react';
import { Colors, LightColors } from './theme';
import { useSettingsStore } from './store/settingsStore';

type ColorPalette = typeof Colors;

const ThemeContext = createContext<ColorPalette>(Colors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const darkMode = useSettingsStore(s => s.darkMode);
  // When darkMode is ON → use the default dark navy palette (Colors).
  // When darkMode is OFF → use parchment light palette.
  const palette = darkMode ? Colors : LightColors;

  return (
    <ThemeContext.Provider value={palette}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ColorPalette {
  return useContext(ThemeContext);
}

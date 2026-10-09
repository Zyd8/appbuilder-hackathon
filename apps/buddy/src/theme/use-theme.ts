import { colors, type ThemeColors } from './tokens';

/** The Angat brand is light-only (white background), so the system color scheme is ignored. */
export function useTheme(): { colors: ThemeColors } {
  return { colors };
}

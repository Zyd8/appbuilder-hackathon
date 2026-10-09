import { Platform } from 'react-native';

import type { LifeArea } from '@/domain/types';

/**
 * Angat brand: light-only. White is the app background; blues come from the logo
 * (deep #0033C4 → royal #0047D9 → bright #0A6CF0 → sky #00A6F0).
 * Usage rules: docs/design/angat-design-system.md. Keep that file in sync with these values.
 */
export const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF5FF',
  text: '#0B1F5C',
  textMuted: '#4B5D8A',
  primary: '#0047D9',
  onPrimary: '#FFFFFF',
  /** Empty part of a bar drawn on `primary` or the brand gradient. */
  onPrimaryTrack: 'rgba(255, 255, 255, 0.28)',
  accent: '#006BB8',
  accentSoft: '#E3F3FF',
  success: '#0B6E99',
  successSoft: '#E0F2FA',
  border: '#D6E3FB',
  glow: 'rgba(0, 71, 217, 0.14)',
  /** Shadow tint for elevated elements on the brand gradient. */
  shadow: '#001A66',
  danger: '#B42318',
} as const;

/** Logo gradient for hero panels. White text sits on the deep end (>= 4.5:1 across deep → royal). */
export const brandGradient = {
  deep: '#0033C4',
  royal: '#0A5BE8',
  sky: '#00A6F0',
} as const;

export type ThemeColors = { [K in keyof typeof colors]: string };

/**
 * Area colors always appear next to a text label, never as the only signal.
 * All blue-family mid-tones with >= 4.5:1 contrast on white.
 */
export const areaColors: Record<LifeArea, string> = {
  focus: '#2563EB',
  creativity: '#5865E0',
  knowledge: '#0E7490',
  social: '#1C74D9',
  finance: '#3B5BDB',
  calm: '#5A6FC8',
  health: '#0369A1',
  organization: '#3366CC',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const fonts = {
  rounded: Platform.select({ ios: 'ui-rounded', default: undefined }),
  mono: Platform.select({ ios: 'ui-monospace', default: 'monospace' }),
};

export const typography = {
  hero: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.5 },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1.2 },
};

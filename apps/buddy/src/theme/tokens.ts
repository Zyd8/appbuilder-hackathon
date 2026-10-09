import { Platform } from 'react-native';

import type { LifeArea } from '@/domain/types';

export const palette = {
  light: {
    background: '#F6F4FF',
    surface: '#FFFFFF',
    surfaceAlt: '#EEEAFE',
    text: '#1B1630',
    textMuted: '#5E5875',
    primary: '#5B3BE8',
    onPrimary: '#FFFFFF',
    accent: '#B86E00',
    accentSoft: '#FFF1D9',
    success: '#1F7A52',
    successSoft: '#DDF5E9',
    border: '#E1DCF5',
    glow: 'rgba(91, 59, 232, 0.16)',
    danger: '#B42318',
  },
  dark: {
    background: '#100D1F',
    surface: '#1A1630',
    surfaceAlt: '#241F40',
    text: '#F3F0FF',
    textMuted: '#ABA4C8',
    primary: '#A08BFF',
    onPrimary: '#120E24',
    accent: '#FFC56B',
    accentSoft: '#3A2E14',
    success: '#4CC38A',
    successSoft: '#163626',
    border: '#2E2850',
    glow: 'rgba(160, 139, 255, 0.22)',
    danger: '#FF8A80',
  },
} as const;

export type ThemeColors = { [K in keyof typeof palette.light]: string };

/** Area colors always appear next to a text label, never as the only signal. */
export const areaColors: Record<LifeArea, string> = {
  focus: '#5B8DEF',
  creativity: '#E86FA8',
  knowledge: '#3FA7A0',
  social: '#F08A4B',
  finance: '#4FA35B',
  calm: '#8E7CF0',
  health: '#E5584F',
  organization: '#C9A227',
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
  display: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1.2 },
};

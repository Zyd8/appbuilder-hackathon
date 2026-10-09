import { brandGradient, colors } from '@/theme/tokens';

/**
 * The Angat palette a widget needs, picked from the design tokens (no raw hex here).
 * The iOS widget runs in an isolated runtime that cannot import modules, so it receives this
 * object as a prop. The Android widgets import it directly.
 */
export const widgetTheme = {
  background: colors.background,
  surfaceAlt: colors.surfaceAlt,
  text: colors.text,
  textMuted: colors.textMuted,
  primary: colors.primary,
  onPrimary: colors.onPrimary,
  accent: colors.accent,
  success: colors.success,
  successSoft: colors.successSoft,
  border: colors.border,
  danger: colors.danger,
  gradientStart: brandGradient.deep,
  gradientEnd: brandGradient.royal,
} as const;

export type WidgetTheme = { [K in keyof typeof widgetTheme]: string };

/** Hex colors with an alpha channel for Android (`#RRGGBBAA` is not supported there, `rgba()` is). */
export function withAlpha(hex: string, alpha: number): `rgba(${number}, ${number}, ${number}, ${number})` {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

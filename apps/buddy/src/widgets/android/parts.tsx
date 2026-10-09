"use no memo";

import React from 'react';
import { FlexWidget, IconWidget, TextWidget } from 'react-native-android-widget';

import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

import { widgetTheme, withAlpha } from '../widget-theme';

type Color = `#${string}` | `rgba(${number}, ${number}, ${number}, ${number})`;

/** Name of the Ionicons font copied into the Android app by the `react-native-android-widget` plugin (app.json). */
const ICON_FONT = 'Ionicons';

const glyphs = glyphMap as Record<string, number>;

export const WIDGET_URL = {
  player: 'buddylevelup:///player',
  today: 'buddylevelup:///today',
  notes: 'buddylevelup:///notes',
  newNote: 'buddylevelup:///note/new',
  quest: (id: string) => `buddylevelup:///quest/${id}`,
  note: (id: string) => `buddylevelup:///note/${id}`,
} as const;

/** An Ionicons glyph, the same icon set the app uses. */
export function Ion({ name, size, color }: { name: string; size: number; color: Color }) {
  const code = glyphs[name] ?? glyphs['help-outline'];
  return <IconWidget font={ICON_FONT} icon={String.fromCodePoint(code)} size={size} style={{ color }} />;
}

/** Overline label: uppercase, small, bold, wide tracking (design system section 4). */
export function Overline({ text, color = widgetTheme.primary }: { text: string; color?: Color }) {
  return (
    <TextWidget
      text={text.toUpperCase()}
      maxLines={1}
      style={{ color, fontSize: 11, fontWeight: 'bold', letterSpacing: 1.2 }}
    />
  );
}

/** Thin XP bar. Weights split the track, so it needs no pixel width. */
export function Bar({
  progress,
  fill,
  track,
  height = 6,
}: {
  progress: number;
  fill: Color;
  track: Color;
  height?: number;
}) {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height,
        flexDirection: 'row',
        backgroundColor: track,
        borderRadius: height / 2,
        overflow: 'hidden',
      }}
    >
      {percent > 0 ? <FlexWidget style={{ flex: percent, height, backgroundColor: fill }} /> : null}
      {percent < 100 ? <FlexWidget style={{ flex: 100 - percent, height }} /> : null}
    </FlexWidget>
  );
}

/** White "LV n" circle from the player's level meter. */
export function LevelBadge({ label, level, size = 42 }: { label: string; level: number; size?: number }) {
  return (
    <FlexWidget
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: widgetTheme.background,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget text={label} style={{ color: widgetTheme.primary, fontSize: 9, fontWeight: 'bold', letterSpacing: 1 }} />
      <TextWidget text={String(level)} style={{ color: widgetTheme.primary, fontSize: 16, fontWeight: 'bold' }} />
    </FlexWidget>
  );
}

/** White pill with a `primary` icon and label, used on the brand gradient. */
export function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: widgetTheme.background,
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 4,
      }}
    >
      <Ion name={icon} size={13} color={widgetTheme.primary} />
      <FlexWidget style={{ width: 4 }} />
      <TextWidget text={label} maxLines={1} style={{ color: widgetTheme.primary, fontSize: 12, fontWeight: '600' }} />
    </FlexWidget>
  );
}

/** Circle with an icon, tinted like the app's area chips (icon in the area color on a 10% tint). */
export function IconChip({
  icon,
  color,
  background,
  size = 40,
}: {
  icon: string;
  color: Color;
  background: Color;
  size?: number;
}) {
  return (
    <FlexWidget
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ion name={icon} size={Math.round(size * 0.5)} color={color} />
    </FlexWidget>
  );
}

export { withAlpha };

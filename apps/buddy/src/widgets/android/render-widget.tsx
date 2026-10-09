import React from 'react';

import type { WidgetSnapshot } from '../widget-snapshot';
import { BuddyWidget } from './BuddyWidget';
import { DailyQuestWidget } from './DailyQuestWidget';
import { TodayNotesWidget } from './TodayNotesWidget';

/** Names registered in `app.json` (`react-native-android-widget` plugin). */
export const ANDROID_WIDGET_NAMES = ['BuddyWidget', 'BuddyQuestWidget', 'BuddyNotesWidget'] as const;

export type AndroidWidgetName = (typeof ANDROID_WIDGET_NAMES)[number];

/** Used when the launcher has not reported a size yet. Matches the default 4 x 2 cell widget. */
const FALLBACK_SIZE = { width: 300, height: 140 };

export function renderAndroidWidget(
  name: string,
  snapshot: WidgetSnapshot,
  size: { width?: number; height?: number } = {},
) {
  const width = size.width && size.width > 0 ? size.width : FALLBACK_SIZE.width;
  const height = size.height && size.height > 0 ? size.height : FALLBACK_SIZE.height;

  switch (name) {
    case 'BuddyWidget':
      return <BuddyWidget player={snapshot.player} width={width} height={height} />;
    case 'BuddyQuestWidget':
      return <DailyQuestWidget quest={snapshot.quest} labels={snapshot.labels} height={height} />;
    case 'BuddyNotesWidget':
      return <TodayNotesWidget notes={snapshot.notes} labels={snapshot.labels} height={height} />;
    default:
      return null;
  }
}

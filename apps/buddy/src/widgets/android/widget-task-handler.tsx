import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { BuddyWidget } from './BuddyWidget';
import { DailyQuestWidget } from './DailyQuestWidget';
import { TodayNotesWidget } from './TodayNotesWidget';
import { readWidgetSnapshot } from '../widget-snapshot';

export async function widgetTaskHandler({
  widgetInfo,
  widgetAction,
  renderWidget,
}: WidgetTaskHandlerProps) {
  if (
    widgetAction === 'WIDGET_ADDED' ||
    widgetAction === 'WIDGET_UPDATE' ||
    widgetAction === 'WIDGET_RESIZED'
  ) {
    const snapshot = readWidgetSnapshot();
    const player = snapshot?.player ?? { level: 1, xp: 0, progress: 0, trend: [20, 35, 28, 52, 45, 68, 60] };
    const quest = snapshot?.dailyQuest ?? { id: 'daily-quest', title: 'Take one small step', minutes: 5, done: false };
    const notes = snapshot?.notes ?? [];

    if (widgetInfo.widgetName === 'BuddyWidget') {
      renderWidget(<BuddyWidget {...player} />);
    }

    if (widgetInfo.widgetName === 'BuddyQuestWidget') {
      renderWidget(
        <DailyQuestWidget title={quest.title} minutes={quest.minutes} done={quest.done} questId={quest.id} />,
      );
    }

    if (widgetInfo.widgetName === 'BuddyNotesWidget') {
      renderWidget(<TodayNotesWidget notes={notes} />);
    }
  }
}

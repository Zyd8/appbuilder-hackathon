import { BuddyWidget } from './BuddyWidget';
import { DailyQuestWidget } from './DailyQuestWidget';
import { TodayNotesWidget } from './TodayNotesWidget';
import { readWidgetSnapshot } from '../widget-snapshot';

export function initializeBuddyWidget() {
  const snapshot = readWidgetSnapshot();
  const player = snapshot?.player ?? { level: 1, xp: 0, progress: 0, trend: [20, 35, 28, 52, 45, 68, 60] };
  const quest = snapshot?.dailyQuest ?? { id: 'daily-quest', title: 'Take one small step', minutes: 5, done: false };
  const notes = snapshot?.notes ?? [];

  BuddyWidget.updateSnapshot(player);
  DailyQuestWidget.updateSnapshot({ ...quest, questId: quest.id });
  TodayNotesWidget.updateSnapshot({ notes });
}

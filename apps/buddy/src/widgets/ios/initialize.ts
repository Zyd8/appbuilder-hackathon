import { readWidgetSnapshot, type WidgetSnapshot } from '../widget-snapshot';
import { widgetTheme } from '../widget-theme';
import { ensureWidgetAvatar } from './avatar';
import { BuddyWidget } from './BuddyWidget';
import { DailyQuestWidget } from './DailyQuestWidget';
import { TodayNotesWidget } from './TodayNotesWidget';

let avatarUri: Promise<string | undefined> | undefined;

/** Push the snapshot into the three iOS widgets. WidgetKit then redraws them. */
export async function updateIosWidgets(snapshot: WidgetSnapshot): Promise<void> {
  avatarUri ??= ensureWidgetAvatar();
  const avatar = await avatarUri;

  BuddyWidget.updateSnapshot({ theme: widgetTheme, player: snapshot.player, avatarUri: avatar });
  DailyQuestWidget.updateSnapshot({ theme: widgetTheme, quest: snapshot.quest, labels: snapshot.labels });
  TodayNotesWidget.updateSnapshot({ theme: widgetTheme, notes: snapshot.notes, labels: snapshot.labels });
}

export function initializeBuddyWidget() {
  void updateIosWidgets(readWidgetSnapshot());
}

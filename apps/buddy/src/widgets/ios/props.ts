import type { WidgetSnapshot } from '../widget-snapshot';
import type { WidgetTheme } from '../widget-theme';

/**
 * The iOS widget body runs in an isolated runtime with no access to app modules, so the palette
 * travels in with the data. Every widget receives it as `theme`.
 */
export type WithTheme<T> = T & { theme: WidgetTheme };

export type BuddyWidgetProps = WithTheme<{
  player: WidgetSnapshot['player'];
  /** File URI of the avatar copied into the shared app-group folder, when that worked. */
  avatarUri?: string;
}>;

export type DailyQuestWidgetProps = WithTheme<{
  quest: WidgetSnapshot['quest'];
  labels: WidgetSnapshot['labels'];
}>;

export type TodayNotesWidgetProps = WithTheme<{
  notes: WidgetSnapshot['notes'];
  labels: WidgetSnapshot['labels'];
}>;

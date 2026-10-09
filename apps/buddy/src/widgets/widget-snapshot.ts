import 'expo-sqlite/localStorage/install';

import { areaLabel, LIFE_AREA_ICONS } from '@/data/life-areas';
import { sortNotes } from '@/domain/notes';
import type { LifeArea, Note, PlayerProfile, Quest } from '@/domain/types';
import { levelFromTotalXp } from '@/domain/xp';
import { t } from '@/i18n';
import { areaColors } from '@/theme/tokens';

/** Bumped when the shape changes. Older snapshots are ignored, so a stale shape never reaches a widget. */
export const WIDGET_SNAPSHOT_KEY = 'buddy.widget.snapshot.v2';

/** Notes a widget can ever show. The widgets trim this further to fit their size. */
export const WIDGET_MAX_NOTES = 5;

/**
 * Everything a widget draws, already formatted for display (strings come from `t()` here, because the
 * iOS widget runs in an isolated runtime that cannot import them). Both platforms render this one shape.
 */
export interface WidgetSnapshot {
  version: 2;
  player: {
    name: string;
    title: string;
    level: number;
    /** 0..1 progress into the current level. */
    progress: number;
    levelLabel: string;
    xpLabel: string;
    streakLabel: string;
    restLabel: string;
    accessibilityLabel: string;
  };
  quest: {
    /** Quest to open, or undefined when the board is empty. */
    id?: string;
    title: string;
    area: LifeArea;
    areaLabel: string;
    /** Ionicons name, as used by `QuestRow`. */
    areaIcon: string;
    areaColor: string;
    /** "10 min" */
    minutesLabel: string;
    /** "+20 XP" */
    xpLabel: string;
    done: boolean;
    /** Every daily quest is finished. */
    allDone: boolean;
    /** No quests on the board. */
    empty: boolean;
    doneCount: number;
    total: number;
    progressLabel: string;
  };
  notes: {
    items: { id: string; body: string; done: boolean; high: boolean }[];
    /** How many of today's notes are not shown. */
    hiddenCount: number;
    openCount: number;
    openLabel: string;
  };
  labels: {
    questEyebrow: string;
    questAllDone: string;
    questAllDoneHint: string;
    questEmpty: string;
    questEmptyHint: string;
    notesEyebrow: string;
    notesAdd: string;
    notesEmpty: string;
    notesDone: string;
  };
}

function storage(): Storage | undefined {
  return typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined;
}

function labels(): WidgetSnapshot['labels'] {
  return {
    questEyebrow: t('widget.quest.eyebrow'),
    questAllDone: t('widget.quest.allDone'),
    questAllDoneHint: t('widget.quest.allDoneHint'),
    questEmpty: t('widget.quest.empty'),
    questEmptyHint: t('widget.quest.emptyHint'),
    notesEyebrow: t('widget.notes.eyebrow'),
    notesAdd: t('widget.notes.add'),
    notesEmpty: t('widget.notes.empty'),
    notesDone: t('widget.notes.done'),
  };
}

/** The quest a widget features: the first one still to do, else the last finished one. */
export function featuredQuest(quests: readonly Quest[]): Quest | undefined {
  return quests.find((quest) => quest.status !== 'done') ?? quests[quests.length - 1];
}

export function snapshotFromAppData(
  profile: Pick<PlayerProfile, 'displayName' | 'title' | 'totalXp' | 'streakDays' | 'restTokens'>,
  quests: readonly Quest[],
  todayNotes: readonly Note[],
  accountName?: string | null,
): WidgetSnapshot {
  const level = levelFromTotalXp(profile.totalXp);
  const name = accountName?.trim() || profile.displayName.trim() || t('widget.player.fallbackName');
  const xpLabel = t('player.xp', { current: level.xpIntoLevel, next: level.xpForNext });
  const streakLabel = t('player.streak', { count: profile.streakDays });
  const restLabel = t('player.restShort', { count: profile.restTokens });

  const featured = featuredQuest(quests);
  const doneCount = quests.filter((quest) => quest.status === 'done').length;
  const area: LifeArea = featured?.area ?? 'focus';

  const sorted = sortNotes(todayNotes);
  const items = sorted
    .slice(0, WIDGET_MAX_NOTES)
    .map((note) => ({ id: note.id, body: note.body, done: note.done, high: note.priority === 'high' }));
  const openCount = sorted.filter((note) => !note.done).length;
  const hiddenCount = Math.max(0, sorted.length - items.length);

  return {
    version: 2,
    player: {
      name,
      title: profile.title,
      level: level.level,
      progress: Math.max(0, Math.min(1, level.progress)),
      levelLabel: t('player.levelShort'),
      xpLabel,
      streakLabel,
      restLabel,
      accessibilityLabel: `${name}, ${t('player.level', { level: level.level })}, ${profile.title}, ${xpLabel}, ${streakLabel}`,
    },
    quest: {
      id: featured?.id,
      title: featured?.title ?? t('widget.quest.empty'),
      area,
      areaLabel: areaLabel(area),
      areaIcon: LIFE_AREA_ICONS[area],
      areaColor: areaColors[area],
      minutesLabel: t('quests.minutes', { count: featured?.estMinutes ?? 5 }),
      xpLabel: t('quests.xp', { count: featured?.xp ?? 0 }),
      done: featured?.status === 'done',
      allDone: quests.length > 0 && doneCount === quests.length,
      empty: quests.length === 0,
      doneCount,
      total: quests.length,
      progressLabel: t('widget.quest.progress', { done: doneCount, total: quests.length }),
    },
    notes: {
      items,
      hiddenCount,
      openCount,
      openLabel: t('widget.notes.openCount', { count: openCount }),
    },
    labels: labels(),
  };
}

/** What a widget shows before the app has ever written a snapshot (a fresh install). */
export function placeholderSnapshot(): WidgetSnapshot {
  return snapshotFromAppData(
    { displayName: '', title: '', totalXp: 0, streakDays: 0, restTokens: 0 },
    [],
    [],
  );
}

export function writeWidgetSnapshot(snapshot: WidgetSnapshot): void {
  try {
    storage()?.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Widgets fall back to the placeholder when storage is unavailable.
  }
}

export function readWidgetSnapshot(): WidgetSnapshot {
  try {
    const raw = storage()?.getItem(WIDGET_SNAPSHOT_KEY);
    if (!raw) return placeholderSnapshot();
    const parsed = JSON.parse(raw) as Partial<WidgetSnapshot>;
    return parsed.version === 2 ? (parsed as WidgetSnapshot) : placeholderSnapshot();
  } catch {
    return placeholderSnapshot();
  }
}

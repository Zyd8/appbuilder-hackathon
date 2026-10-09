import 'expo-sqlite/localStorage/install';

import type { Note, Quest } from '@/domain/types';
import { levelFromTotalXp } from '@/domain/xp';

export const WIDGET_SNAPSHOT_KEY = 'buddy.widget.snapshot.v1';

export interface WidgetSnapshot {
  player: {
    level: number;
    xp: number;
    progress: number;
    trend: number[];
  };
  dailyQuest: {
    id: string;
    title: string;
    minutes: number;
    done: boolean;
  };
  notes: {
    id: string;
    body: string;
    done: boolean;
  }[];
}

function storage(): Storage | undefined {
  return typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined;
}

export function snapshotFromAppData(profile: { totalXp: number; stats: Record<string, number> }, quests: Quest[], notes: Note[]): WidgetSnapshot {
  const level = levelFromTotalXp(profile.totalXp);
  const firstQuest = quests[0];
  const trend = Object.values(profile.stats).slice(0, 7).map((value) => Math.max(0, Math.min(100, value)));

  return {
    player: {
      level: level.level,
      xp: level.xpIntoLevel,
      progress: level.progress,
      trend: trend.length > 0 ? trend : [20, 35, 28, 52, 45, 68, 60],
    },
    dailyQuest: {
      id: firstQuest?.id ?? 'daily-quest',
      title: firstQuest?.title ?? 'Take one small step',
      minutes: firstQuest?.estMinutes ?? 5,
      done: firstQuest?.status === 'done',
    },
    notes: notes.slice(0, 4).map((note) => ({ id: note.id, body: note.body, done: note.done })),
  };
}

export function writeWidgetSnapshot(snapshot: WidgetSnapshot): void {
  try {
    storage()?.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Widgets fall back to preview values when storage is unavailable.
  }
}

export function readWidgetSnapshot(): WidgetSnapshot | undefined {
  try {
    const raw = storage()?.getItem(WIDGET_SNAPSHOT_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    return undefined;
  }
}

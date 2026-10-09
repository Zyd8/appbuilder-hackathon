import { dateKey } from './activity';
import type { LifeArea, Quest } from './types';

export const SHARE_BAR_COUNT = 12;

export interface ProgressSummary {
  /** Day one: the day of the first finished quest (today when there is none), local YYYY-MM-DD. */
  startDate: string;
  /** Today, local YYYY-MM-DD. */
  endDate: string;
  /** Calendar days from `startDate` to `endDate`, both included: the "Day n" of the journey. */
  days: number;
  questsDone: number;
  activeDays: number;
  /** XP earned from all finished quests. */
  xp: number;
  topArea?: LifeArea;
  /** Quests finished per slice of the journey, oldest first. Always `SHARE_BAR_COUNT` long. */
  bars: number[];
}

type HistoryItem = Pick<Quest, 'status' | 'completedAt' | 'xp' | 'area'>;

function dayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / 86_400_000);
}

/**
 * Summarizes all finished quests for a share card. "Day one" is the day of the first finished
 * quest; with no history yet it is today, so the card still renders (as day 1, zero quests).
 */
export function summarizeProgress(history: HistoryItem[], now: Date): ProgressSummary {
  const today = dayStart(now);
  const finished: { at: Date; item: HistoryItem }[] = [];
  for (const item of history) {
    if (item.status !== 'done' || !item.completedAt) continue;
    const at = new Date(item.completedAt);
    if (Number.isNaN(at.getTime()) || at.getTime() > now.getTime()) continue;
    finished.push({ at, item });
  }

  const start = dayStart(finished.reduce<Date>((min, f) => (f.at < min ? f.at : min), today));
  const days = daysBetween(start, today) + 1;

  const activeKeys = new Set(finished.map((f) => dateKey(f.at)));
  const areaCounts = new Map<LifeArea, number>();
  const bars = new Array<number>(SHARE_BAR_COUNT).fill(0);
  let xp = 0;
  for (const { at, item } of finished) {
    xp += item.xp;
    areaCounts.set(item.area, (areaCounts.get(item.area) ?? 0) + 1);
    // Spread days across the bars so the first day lands in the first bar and today in the last.
    const slice =
      days === 1 ? SHARE_BAR_COUNT - 1 : Math.round((daysBetween(start, at) / (days - 1)) * (SHARE_BAR_COUNT - 1));
    bars[slice] += 1;
  }

  let topArea: LifeArea | undefined;
  let best = 0;
  for (const [area, count] of areaCounts) {
    if (count > best) {
      best = count;
      topArea = area;
    }
  }

  return {
    startDate: dateKey(start),
    endDate: dateKey(today),
    days,
    questsDone: finished.length,
    activeDays: activeKeys.size,
    xp,
    topArea,
    bars,
  };
}

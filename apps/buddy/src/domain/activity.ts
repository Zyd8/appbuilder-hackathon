import type { Quest } from './types';

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityDay {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Quests completed that day. */
  count: number;
  level: ActivityLevel;
  /** Days after today in the current week; drawn as empty space. */
  future: boolean;
}

export interface ActivityGrid {
  /** Oldest week first. Each week runs Sunday to Saturday, like the GitHub contribution graph. */
  weeks: ActivityDay[][];
  total: number;
  activeDays: number;
}

/** Local-time date key. A quest finished at 7am local must count for that local day, not the UTC one. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function activityLevel(count: number): ActivityLevel {
  if (count <= 0) return 0;
  return Math.min(4, Math.floor(count)) as ActivityLevel;
}

/** Buckets completed quests by local day into `weeks` Sunday-first columns ending with the week of `now`. */
export function buildActivityGrid(history: Pick<Quest, 'status' | 'completedAt'>[], now: Date, weeks: number): ActivityGrid {
  const counts = new Map<string, number>();
  for (const quest of history) {
    if (quest.status !== 'done' || !quest.completedAt) continue;
    const completed = new Date(quest.completedAt);
    if (Number.isNaN(completed.getTime())) continue;
    const key = dateKey(completed);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() - (weeks - 1) * 7);

  let total = 0;
  let activeDays = 0;
  const columns: ActivityDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: ActivityDay[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
      const future = day.getTime() > today.getTime();
      const date = dateKey(day);
      const count = future ? 0 : (counts.get(date) ?? 0);
      total += count;
      if (count > 0) activeDays += 1;
      column.push({ date, count, level: activityLevel(count), future });
    }
    columns.push(column);
  }
  return { weeks: columns, total, activeDays };
}

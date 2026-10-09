/**
 * Local calendar dates as `YYYY-MM-DD`. Always built from local Y/M/D, never `toISOString()`,
 * which gives the UTC date (in UTC+8 that is yesterday until 8 AM).
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function localIsoDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** True for a real calendar date in `YYYY-MM-DD` form (rejects `2026-02-30`). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Local midnight of an ISO date. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Oct 12" in the user's locale. */
export function shortDateLabel(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "Saturday, Oct 12" in the user's locale. */
export function longDateLabel(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function addDays(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
}

/** A calendar month; `month` is 0-based like `Date`. */
export interface YearMonth {
  year: number;
  month: number;
}

export function monthOf(iso: string): YearMonth {
  const date = parseIsoDate(iso);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function sameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export interface CalendarCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** Six weeks (42 cells) starting on Sunday, padded with days from the months around it. */
export function monthGrid({ year, month }: YearMonth): CalendarCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ iso: localIsoDate(date), day: date.getDate(), inMonth: date.getMonth() === month });
  }
  return cells;
}

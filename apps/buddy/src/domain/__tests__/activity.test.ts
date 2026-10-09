/// <reference types="jest" />
import { activityLevel, buildActivityGrid, dateKey } from '../activity';

// Friday, 9 October 2026 (local time).
const NOW = new Date(2026, 9, 9, 12, 0, 0);

const done = (date: Date) => ({ status: 'done' as const, completedAt: date.toISOString() });

describe('activityLevel', () => {
  it('maps counts to 0–4 and caps at 4', () => {
    expect([0, 1, 2, 3, 4, 9].map(activityLevel)).toEqual([0, 1, 2, 3, 4, 4]);
  });
});

describe('buildActivityGrid', () => {
  it('builds Sunday-first weeks ending with the current week', () => {
    const grid = buildActivityGrid([], NOW, 4);
    expect(grid.weeks).toHaveLength(4);
    expect(grid.weeks.every((w) => w.length === 7)).toBe(true);
    expect(grid.weeks[3][0].date).toBe('2026-10-04'); // Sunday of this week
    expect(grid.weeks[3][5].date).toBe('2026-10-09'); // today
    expect(grid.weeks[0][0].date).toBe('2026-09-13');
    expect(grid.total).toBe(0);
    expect(grid.activeDays).toBe(0);
  });

  it('marks only the days after today as future', () => {
    const last = buildActivityGrid([], NOW, 2).weeks[1];
    expect(last.map((d) => d.future)).toEqual([false, false, false, false, false, false, true]);
  });

  it('counts completed quests on their local day', () => {
    const history = [
      done(new Date(2026, 9, 9, 7, 0)),
      done(new Date(2026, 9, 9, 22, 30)),
      done(new Date(2026, 9, 7, 9, 0)),
    ];
    const grid = buildActivityGrid(history, NOW, 2);
    const byDate = Object.fromEntries(grid.weeks.flat().map((d) => [d.date, d]));
    expect(byDate['2026-10-09']).toMatchObject({ count: 2, level: 2 });
    expect(byDate['2026-10-07']).toMatchObject({ count: 1, level: 1 });
    expect(grid.total).toBe(3);
    expect(grid.activeDays).toBe(2);
  });

  it('ignores quests that are not done, lack a timestamp, or fall outside the window', () => {
    const history = [
      { status: 'active' as const, completedAt: NOW.toISOString() },
      { status: 'done' as const },
      { status: 'done' as const, completedAt: 'not a date' },
      done(new Date(2025, 0, 1)),
    ];
    expect(buildActivityGrid(history, NOW, 4).total).toBe(0);
  });
});

describe('dateKey', () => {
  it('pads month and day', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

/// <reference types="jest" />
import { SHARE_BAR_COUNT, summarizeProgress } from '../progress-share';

// Friday, 9 October 2026 (local time).
const NOW = new Date(2026, 9, 9, 12, 0, 0);

const done = (date: Date, xp = 10, area: 'focus' | 'calm' = 'focus') => ({
  status: 'done' as const,
  completedAt: date.toISOString(),
  xp,
  area,
});

describe('summarizeProgress', () => {
  it('renders day 1 with zeros when nothing is finished yet', () => {
    const s = summarizeProgress([], NOW);
    expect(s).toMatchObject({ startDate: '2026-10-09', endDate: '2026-10-09', days: 1, questsDone: 0, activeDays: 0, xp: 0 });
    expect(s.topArea).toBeUndefined();
    expect(s.bars).toHaveLength(SHARE_BAR_COUNT);
  });

  it('starts the journey on the day of the first finished quest', () => {
    const s = summarizeProgress([done(new Date(2026, 9, 1, 8)), done(new Date(2026, 9, 9, 9))], NOW);
    expect(s.startDate).toBe('2026-10-01');
    expect(s.days).toBe(9);
    expect(s.questsDone).toBe(2);
    expect(s.activeDays).toBe(2);
  });

  it('sums XP, counts active days once, and picks the most-finished area', () => {
    const history = [
      done(new Date(2026, 9, 8, 7), 20, 'calm'),
      done(new Date(2026, 9, 8, 20), 35, 'calm'),
      done(new Date(2026, 9, 9, 7), 10, 'focus'),
    ];
    const s = summarizeProgress(history, NOW);
    expect(s.xp).toBe(65);
    expect(s.activeDays).toBe(2);
    expect(s.topArea).toBe('calm');
    expect(s.bars.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('ignores quests that are not done, undated, invalid, or in the future', () => {
    const history = [
      { status: 'skipped' as const, completedAt: NOW.toISOString(), xp: 10, area: 'focus' as const },
      { status: 'done' as const, completedAt: undefined, xp: 10, area: 'focus' as const },
      { status: 'done' as const, completedAt: 'nope', xp: 10, area: 'focus' as const },
      done(new Date(2026, 9, 10)),
    ];
    expect(summarizeProgress(history, NOW).questsDone).toBe(0);
  });

  it('puts the first and last day in the first and last bars', () => {
    const s = summarizeProgress([done(new Date(2026, 9, 1)), done(new Date(2026, 9, 9))], NOW);
    expect(s.bars[0]).toBe(1);
    expect(s.bars[SHARE_BAR_COUNT - 1]).toBe(1);
  });
});

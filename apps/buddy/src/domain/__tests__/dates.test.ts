/// <reference types="jest" />
import { addDays, addMonths, isIsoDate, localIsoDate, monthGrid, monthOf, sameMonth } from '../dates';

describe('localIsoDate', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // 00:30 local time: in any timezone east of UTC, toISOString() would still say the 9th.
    expect(localIsoDate(new Date(2026, 9, 10, 0, 30))).toBe('2026-10-10');
    expect(localIsoDate(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09');
  });

  it('pads month and day', () => {
    expect(localIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('isIsoDate', () => {
  it('accepts real dates only', () => {
    expect(isIsoDate('2026-10-09')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-10-9')).toBe(false);
    expect(isIsoDate(20261009)).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});

describe('addDays and months', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(monthOf('2026-10-09')).toEqual({ year: 2026, month: 9 });
    expect(sameMonth({ year: 2026, month: 9 }, monthOf('2026-10-31'))).toBe(true);
  });
});

describe('monthGrid', () => {
  it('returns six Sunday-first weeks with padding days marked', () => {
    // October 2026 starts on a Thursday.
    const cells = monthGrid({ year: 2026, month: 9 });
    expect(cells).toHaveLength(42);
    expect(cells[0]).toEqual({ iso: '2026-09-27', day: 27, inMonth: false });
    expect(cells[4]).toEqual({ iso: '2026-10-01', day: 1, inMonth: true });
    expect(cells.filter((c) => c.inMonth)).toHaveLength(31);
  });

  it('starts on the 1st when the month begins on Sunday', () => {
    // February 2026 starts on a Sunday.
    expect(monthGrid({ year: 2026, month: 1 })[0]).toEqual({ iso: '2026-02-01', day: 1, inMonth: true });
  });

  it('handles leap-year February', () => {
    const cells = monthGrid({ year: 2028, month: 1 });
    expect(cells.filter((c) => c.inMonth).map((c) => c.iso).at(-1)).toBe('2028-02-29');
  });
});

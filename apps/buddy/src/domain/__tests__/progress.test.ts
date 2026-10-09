/// <reference types="jest" />
import { hasUnsyncedXp, mergeRemote, newProgress, withTotalXp } from '../progress';

const T0 = '2026-10-09T10:00:00.000Z';
const T1 = '2026-10-09T11:00:00.000Z';

describe('progress', () => {
  it('never lowers XP', () => {
    const doc = newProgress('u1', 500, T0);
    expect(withTotalXp(doc, 100, T1)).toBe(doc);
    expect(withTotalXp(doc, 600, T1).totalXp).toBe(600);
  });

  it('merges by keeping the larger XP from either side', () => {
    const local = newProgress('u1', 300, T0);
    const ahead = mergeRemote(local, { user_id: 'u1', total_xp: 900, updated_at: T1 });
    expect(ahead.totalXp).toBe(900);
    expect(hasUnsyncedXp(ahead)).toBe(false);

    const behind = mergeRemote(local, { user_id: 'u1', total_xp: 100, updated_at: T1 });
    expect(behind.totalXp).toBe(300);
    expect(hasUnsyncedXp(behind)).toBe(true);
  });

  it('is idempotent and order-independent', () => {
    const row = { user_id: 'u1', total_xp: 400, updated_at: T1 };
    const once = mergeRemote(newProgress('u1', 300, T0), row);
    expect(mergeRemote(once, row)).toEqual(once);
  });

  it('flags a never-synced document and clamps bad values', () => {
    expect(hasUnsyncedXp(newProgress('u1', 0, T0))).toBe(true);
    expect(newProgress('u1', -5, T0).totalXp).toBe(0);
    expect(newProgress('u1', Number.NaN, T0).totalXp).toBe(0);
    expect(newProgress('u1', 42.9, T0).totalXp).toBe(42);
  });
});

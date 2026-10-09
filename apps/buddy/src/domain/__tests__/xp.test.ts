/// <reference types="jest" />
import { DAILY_XP_CAP, grantXp, levelFromTotalXp, playerRank, RANK_XP, xpToNextLevel } from '../xp';

describe('xpToNextLevel', () => {
  it('grows with level so later levels take longer', () => {
    expect(xpToNextLevel(1)).toBe(50);
    expect(xpToNextLevel(2)).toBeGreaterThan(xpToNextLevel(1));
    expect(xpToNextLevel(10)).toBeGreaterThan(xpToNextLevel(9));
  });

  it('rejects levels below 1', () => {
    expect(() => xpToNextLevel(0)).toThrow(RangeError);
  });
});

describe('levelFromTotalXp', () => {
  it('starts at level 1 with no XP', () => {
    expect(levelFromTotalXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 50, progress: 0 });
  });

  it('levels up exactly at the threshold', () => {
    expect(levelFromTotalXp(49).level).toBe(1);
    expect(levelFromTotalXp(50).level).toBe(2);
    expect(levelFromTotalXp(50).xpIntoLevel).toBe(0);
  });

  it('treats negative XP as zero', () => {
    expect(levelFromTotalXp(-100).level).toBe(1);
  });
});

describe('grantXp', () => {
  it('grants full XP under the daily cap', () => {
    expect(grantXp(0, RANK_XP.C)).toBe(35);
  });

  it('clips XP at the daily cap', () => {
    expect(grantXp(DAILY_XP_CAP - 10, RANK_XP.B)).toBe(10);
    expect(grantXp(DAILY_XP_CAP, RANK_XP.S)).toBe(0);
  });

  it('never returns negative XP', () => {
    expect(grantXp(DAILY_XP_CAP + 50, 20)).toBe(0);
    expect(grantXp(0, -5)).toBe(0);
  });
});

describe('playerRank', () => {
  it('maps level brackets to rank titles', () => {
    expect(playerRank(1).rank).toBe('E');
    expect(playerRank(5).rank).toBe('D');
    expect(playerRank(10).rank).toBe('C');
    expect(playerRank(50).title).toBe('S-Rank Legend');
  });
});

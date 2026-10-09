/// <reference types="jest" />
import { firstName, goalsFromAnswers, pickBuddyNudge } from '../buddy-nudge';
import type { Quest } from '../types';

function quest(overrides: Partial<Quest>): Quest {
  return {
    id: 'q',
    source: 'library',
    kind: 'daily',
    area: 'focus',
    title: 'Deep work sprint',
    flavor: '',
    instruction: '',
    rank: 'E',
    xp: 10,
    estMinutes: 25,
    status: 'offered',
    offeredOn: '2026-10-09',
    ...overrides,
  };
}

describe('firstName', () => {
  it('takes the first word of a full name', () => {
    expect(firstName('  Sam Rivera Cruz ')).toBe('Sam');
  });

  it('returns undefined for empty input', () => {
    expect(firstName(null)).toBeUndefined();
    expect(firstName('   ')).toBeUndefined();
  });
});

describe('goalsFromAnswers', () => {
  it('keeps only known life areas', () => {
    expect(goalsFromAnswers({ 'goals.more': ['calm', 'bogus', 'health'] })).toEqual(['calm', 'health']);
  });

  it('returns nothing when the goals question was skipped or malformed', () => {
    expect(goalsFromAnswers({})).toEqual([]);
    expect(goalsFromAnswers({ 'goals.more': 'calm' })).toEqual([]);
  });
});

describe('pickBuddyNudge', () => {
  const answers = { 'goals.more': ['creativity', 'health'] };

  it('points at an open quest that matches the goal of the day', () => {
    const quests = [quest({ id: 'a', area: 'focus' }), quest({ id: 'b', area: 'health', title: 'Walk', estMinutes: 10 })];
    expect(pickBuddyNudge({ answers, quests, day: 1 })).toEqual({
      kind: 'goalQuest',
      goal: 'health',
      questTitle: 'Walk',
      minutes: 10,
    });
  });

  it('falls back to another goal quest when the goal of the day has none', () => {
    const quests = [quest({ area: 'health', title: 'Stretch' })];
    expect(pickBuddyNudge({ answers, quests, day: 0 })).toMatchObject({ kind: 'goalQuest', goal: 'health' });
  });

  it('rotates goals by day and ignores done quests', () => {
    const quests = [quest({ area: 'creativity', status: 'done' }), quest({ area: 'focus' })];
    expect(pickBuddyNudge({ answers, quests, day: 0 })).toEqual({ kind: 'goal', goal: 'creativity' });
    expect(pickBuddyNudge({ answers, quests, day: 1 })).toEqual({ kind: 'goal', goal: 'health' });
  });

  it('goes gentle on a low-energy day', () => {
    const checkIn = { date: '2026-10-09', mood: 2 as const, energy: 'low' as const };
    expect(pickBuddyNudge({ answers, quests: [quest({})], checkIn, day: 0 })).toEqual({
      kind: 'lowEnergy',
      goal: 'creativity',
    });
  });

  it('celebrates when every quest is done', () => {
    expect(pickBuddyNudge({ answers, quests: [quest({ status: 'done' })], day: 0 })).toEqual({ kind: 'allDone' });
  });

  it('uses a general line when no goals were chosen', () => {
    expect(pickBuddyNudge({ answers: {}, quests: [quest({})], day: 0 })).toEqual({ kind: 'general' });
  });
});

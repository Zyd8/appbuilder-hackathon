/// <reference types="jest" />
import type { Note, Quest } from '@/domain/types';

import { featuredQuest, snapshotFromAppData, WIDGET_MAX_NOTES } from '../widget-snapshot';

// The snapshot module installs the SQLite-backed localStorage, which needs the native module.
// Jest hoists this above the imports.
jest.mock('expo-sqlite/localStorage/install', () => ({}));

const T0 = '2026-10-09T08:00:00.000Z';

const profile = { displayName: 'Preview', title: 'The Curious Builder', totalXp: 120, streakDays: 3, restTokens: 1 };

function quest(id: string, overrides: Partial<Quest> = {}): Quest {
  return {
    id,
    source: 'library',
    kind: 'daily',
    area: 'calm',
    title: id,
    flavor: '',
    instruction: '',
    rank: 'E',
    xp: 20,
    estMinutes: 10,
    status: 'offered',
    offeredOn: '2026-10-09',
    ...overrides,
  };
}

function note(id: string, overrides: Partial<Note> = {}): Note {
  return { id, body: id, createdAt: T0, updatedAt: T0, done: false, priority: 'normal', ...overrides };
}

describe('featuredQuest', () => {
  it('picks the first quest still to do', () => {
    const quests = [quest('a', { status: 'done' }), quest('b'), quest('c')];
    expect(featuredQuest(quests)?.id).toBe('b');
  });

  it('falls back to the last finished quest when everything is done', () => {
    const quests = [quest('a', { status: 'done' }), quest('b', { status: 'done' })];
    expect(featuredQuest(quests)?.id).toBe('b');
  });

  it('is undefined for an empty board', () => {
    expect(featuredQuest([])).toBeUndefined();
  });
});

describe('snapshotFromAppData', () => {
  it('describes the player like the profile card, preferring the account name', () => {
    const { player } = snapshotFromAppData(profile, [], [], '  Ana Reyes ');
    expect(player.name).toBe('Ana Reyes');
    expect(player.title).toBe('The Curious Builder');
    expect(player.streakLabel).toBe('3-day streak');
    expect(player.restLabel).toBe('1 rest saved');
    expect(player.progress).toBeGreaterThanOrEqual(0);
    expect(player.progress).toBeLessThanOrEqual(1);
  });

  it('falls back to the profile name, then a generic one', () => {
    expect(snapshotFromAppData(profile, [], [], null).player.name).toBe('Preview');
    expect(snapshotFromAppData({ ...profile, displayName: ' ' }, [], []).player.name).toBe('Player');
  });

  it('features the next quest and counts progress', () => {
    const { quest: q } = snapshotFromAppData(profile, [quest('a', { status: 'done' }), quest('b'), quest('c')], []);
    expect(q.id).toBe('b');
    expect(q.done).toBe(false);
    expect(q.allDone).toBe(false);
    expect(q.doneCount).toBe(1);
    expect(q.total).toBe(3);
    expect(q.minutesLabel).toBe('10 min');
    expect(q.xpLabel).toBe('+20 XP');
    expect(q.areaLabel).toBe('Calm');
  });

  it('flags a finished board and an empty one', () => {
    const finished = snapshotFromAppData(profile, [quest('a', { status: 'done' })], []).quest;
    expect(finished.allDone).toBe(true);
    expect(finished.done).toBe(true);

    const empty = snapshotFromAppData(profile, [], []).quest;
    expect(empty.empty).toBe(true);
    expect(empty.id).toBeUndefined();
  });

  it('lists open notes first, high priority on top, and counts what is hidden', () => {
    const notes = [
      note('done', { done: true }),
      note('plain'),
      note('urgent', { priority: 'high' }),
      ...Array.from({ length: 5 }, (_, i) => note(`extra-${i}`)),
    ];
    const { notes: shown } = snapshotFromAppData(profile, [], notes);
    expect(shown.items[0]).toMatchObject({ id: 'urgent', high: true });
    expect(shown.items).toHaveLength(WIDGET_MAX_NOTES);
    expect(shown.hiddenCount).toBe(notes.length - WIDGET_MAX_NOTES);
    expect(shown.openCount).toBe(notes.length - 1);
    expect(shown.items.some((item) => item.id === 'done')).toBe(false);
  });
});

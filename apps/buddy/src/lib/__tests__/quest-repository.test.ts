/// <reference types="jest" />
import type { Quest } from '@/domain/types';
import { migrateBuddyDatabase } from '../buddy-database';
import { QuestRepository } from '../quest-repository';
import { guestNamespace } from '../repository-namespace';
import { testDatabase } from './buddy-database.test';

const quest: Quest = { id: 'q1', source: 'library', kind: 'daily', area: 'focus', title: 'Focus',
  flavor: '', instruction: 'Pause', rank: 'E', xp: 10, estMinutes: 5, status: 'offered', offeredOn: '2026-10-10' };

it('compares revisions, survives repeated reads, and isolates guest rows', async () => {
  const db = testDatabase(); await migrateBuddyDatabase(db);
  const a = new QuestRepository(db, guestNamespace('a'));
  const b = new QuestRepository(db, guestNamespace('b'));
  expect(await a.put(quest, 0)).toEqual({ quest, revision: 1 });
  expect(await a.put(quest, 0)).toBeNull();
  expect(await a.put({ ...quest, status: 'active' }, 1)).toMatchObject({ revision: 2 });
  expect(await a.put({ ...quest, status: 'done' }, 1)).toBeNull();
  expect((await a.list())[0].quest.status).toBe('active');
  expect(await b.get('q1')).toBeNull();
  await db.closeAsync();
});

/// <reference types="jest" />
import { migrateBuddyDatabase } from '../buddy-database';
import { CheckInRepository } from '../check-in-repository';
import { accountNamespace } from '../repository-namespace';
import { testDatabase } from './buddy-database.test';

it('persists a daily check-in with compare-and-swap revisions', async () => {
  const db = testDatabase(); await migrateBuddyDatabase(db);
  const repo = new CheckInRepository(db, accountNamespace('u1'));
  const checkIn = { date: '2026-10-10', mood: 3 as const, energy: 'medium' as const };
  expect(await repo.put(checkIn, 0)).toMatchObject({ revision: 1 });
  expect(await repo.put(checkIn, 0)).toBeNull();
  expect(await repo.put({ ...checkIn, mood: 4 as const }, 1)).toMatchObject({ revision: 2 });
  expect((await repo.latest())?.checkIn.mood).toBe(4);
  expect(await repo.put(checkIn, 1)).toBeNull();
  await db.closeAsync();
});

/// <reference types="jest" />
import { migrateBuddyDatabase } from '../buddy-database';
import { ProgressRepository } from '../progress-repository';
import { accountNamespace, guestNamespace } from '../repository-namespace';
import { loadProgress, writeProgress } from '../progress-storage';
import { newProgress } from '@/domain/progress';
import { testDatabase } from './buddy-database.test';

const mockStore = new Map<string, unknown>();
jest.mock('../progress-storage', () => ({
  loadProgress: (userId: string) => mockStore.get(userId),
  writeProgress: (doc: { userId: string }) => { mockStore.set(doc.userId, doc); },
}));

const NOW = '2026-10-10T10:00:00.000Z';

it('adapts legacy XP, persists daily cap and idempotent awards, and keeps account/guest isolated', async () => {
  const db = testDatabase(); await migrateBuddyDatabase(db);
  const id = `test-${Date.now()}`;
  writeProgress(newProgress(id, 190, NOW));
  const account = new ProgressRepository(db, accountNamespace(id));
  const guest = new ProgressRepository(db, guestNamespace(id));
  expect((await account.hydrate(NOW)).doc.totalXp).toBe(190);
  expect((await guest.hydrate(NOW)).doc.totalXp).toBe(0);
  expect((await account.recordCompletion('q1', '2026-10-10', 120, NOW)).grantedXp).toBe(120);
  expect((await account.recordCompletion('q1', '2026-10-10', 120, NOW)).grantedXp).toBe(120);
  expect((await account.recordCompletion('q2', '2026-10-10', 120, NOW)).grantedXp).toBe(80);
  expect(await account.earnedOn('2026-10-10')).toBe(200);
  expect((await account.hydrate(NOW)).doc.totalXp).toBe(390);
  expect(loadProgress(id)?.totalXp).toBe(390);
  expect((await guest.hydrate(NOW)).doc.totalXp).toBe(0);
  await db.closeAsync();
});

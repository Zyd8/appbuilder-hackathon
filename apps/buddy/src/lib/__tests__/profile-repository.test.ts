/// <reference types="jest" />
import { emptyAssessment, markCompleted, setAnswer } from '@/domain/assessment';
import { analyzeProfile } from '@/domain/profile-analysis';

import { migrateBuddyDatabase } from '../buddy-database';
import { ProfileRepository } from '../profile-repository';
import { accountNamespace, guestNamespace } from '../repository-namespace';
import { testDatabase } from './buddy-database.test';

it('persists analysis, rejects stale revision, isolates namespaces, and ignores corrupt rows', async () => {
  const db = testDatabase(); await migrateBuddyDatabase(db);
  const account = new ProfileRepository(db, accountNamespace('u1'));
  const guest = new ProfileRepository(db, guestNamespace('u1'));
  const doc = markCompleted(setAnswer(emptyAssessment('u1', '2026-10-10T10:00:00Z'),
    'rate.focus', 3, '2026-10-10T10:00:00Z'), '2026-10-10T10:00:00Z');
  const analysis = analyzeProfile(doc);
  expect(await account.save(analysis)).toBe(true);
  expect(await account.save(analysis)).toBe(true);
  expect(await account.read()).toEqual(analysis);
  expect(await guest.read()).toBeNull();
  const newer = analyzeProfile(setAnswer(doc, 'rate.focus', 5, '2026-10-11T10:00:00Z'));
  expect(await account.save(newer)).toBe(true);
  expect(await account.save(analysis)).toBe(false);
  await db.runAsync('UPDATE buddy_profiles SET analysis_json=? WHERE namespace=?', '{bad', accountNamespace('u1'));
  expect(await account.read()).toBeNull();
  await db.closeAsync();
});

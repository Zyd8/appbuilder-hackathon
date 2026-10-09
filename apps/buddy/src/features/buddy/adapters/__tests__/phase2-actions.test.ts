/// <reference types="jest" />
import { QUEST_LIBRARY } from '@/data/quest-library';
import type { ProgressDoc } from '@/domain/progress';
import type { Quest } from '@/domain/types';
import { RANK_XP } from '@/domain/xp';
import { migrateBuddyDatabase } from '@/lib/buddy-database';
import { CheckInRepository } from '@/lib/check-in-repository';
import { ProgressRepository } from '@/lib/progress-repository';
import { QuestRepository } from '@/lib/quest-repository';
import { accountNamespace, guestNamespace } from '@/lib/repository-namespace';
import { testDatabase } from '@/lib/__tests__/buddy-database.test';
import { Phase2Actions } from '../phase2-actions';

const mockProgress = new Map<string, ProgressDoc>();
jest.mock('@/lib/progress-storage', () => ({
  loadProgress: (userId: string) => mockProgress.get(userId),
  writeProgress: (doc: ProgressDoc) => { mockProgress.set(doc.userId, doc); },
}));

const NOW = '2026-10-10T10:00:00.000Z';
const DAY = '2026-10-10';
const PROOF = 'photo-proof-00000001';
const boundary = { date: DAY, maxRank: 'S' as const, energy: 'high' as const, physicalCompletedToday: false };
const template = QUEST_LIBRARY[0];
const quest: Quest = { id: 'quest-1', templateId: template.id, source: 'library', kind: 'daily',
  area: template.area, title: template.title, flavor: template.flavor, instruction: template.instruction,
  rank: template.rank, xp: RANK_XP[template.rank], estMinutes: template.estMinutes,
  status: 'offered', offeredOn: DAY };

async function fixture(namespace = accountNamespace('phase2-test')) {
  const db = testDatabase(); await migrateBuddyDatabase(db);
  const quests = new QuestRepository(db, namespace);
  const checkIns = new CheckInRepository(db, namespace);
  const progress = new ProgressRepository(db, namespace);
  const verify = jest.fn(async (_questId: string, proofId: string) => proofId === PROOF);
  const actions = new Phase2Actions(quests, checkIns, progress, { verify });
  return { db, quests, checkIns, progress, verify, actions };
}

it('hydrates only durable board/history, check-in and ADR-010 XP from repositories', async () => {
  const f = await fixture();
  expect(await f.actions.hydrate(NOW, DAY)).toMatchObject({ board: [], history: [],
    checkIn: null, progress: { doc: { totalXp: 0 } }, earnedToday: 0, recoveryPendingQuestIds: [] });
  expect(await f.actions.upsertCuratedQuest(quest, 0, boundary)).toMatchObject({ revision: 1 });
  await expect(f.actions.completeQuest({ questId: quest.id, expectedRevision: 1, proofId: PROOF,
    idempotencyKey: 'complete-key-0000', now: NOW, localDate: DAY }))
    .rejects.toMatchObject({ code: 'invalid_transition' });
  expect(await f.actions.activateQuest(quest.id, 1)).toMatchObject({ revision: 2, quest: { status: 'active' } });
  expect(await f.actions.saveCheckIn({ date: DAY, mood: 4, energy: 'medium' }, 0)).toMatchObject({ revision: 1 });
  expect((await f.actions.hydrate(NOW, DAY)).board).toHaveLength(1);
  const completed = await f.actions.completeQuest({ questId: quest.id, expectedRevision: 2,
    proofId: PROOF, idempotencyKey: 'complete-key-0001', now: NOW, localDate: DAY });
  expect(completed).toMatchObject({ quest: { quest: { status: 'done' }, revision: 3 },
    completion: { grantedXp: quest.xp }, progress: { doc: { totalXp: quest.xp } }, idempotentReplay: false });
  const reopened = new Phase2Actions(f.quests, f.checkIns, f.progress, { verify: f.verify });
  const after = await reopened.hydrate(NOW, DAY);
  expect(after.board).toHaveLength(0);
  expect(after.history).toHaveLength(1);
  expect(after.checkIn?.checkIn.mood).toBe(4);
  expect(after.earnedToday).toBe(quest.xp);
  expect(after.recoveryPendingQuestIds).toEqual([]);
  expect(JSON.stringify(after)).not.toContain('file://');
  await f.db.closeAsync();
});

it('rejects altered quests, stale check-ins and all path/URI completion fields', async () => {
  const f = await fixture(guestNamespace('phase2-negative'));
  await expect(f.actions.upsertCuratedQuest({ ...quest, title: 'Spend money now' }, 0, boundary)).rejects.toMatchObject({ code: 'invalid_arguments' });
  await expect(f.actions.saveCheckIn({ date: '2026-02-30', mood: 3, energy: 'low' }, 0)).rejects.toMatchObject({ code: 'invalid_arguments' });
  await f.actions.saveCheckIn({ date: DAY, mood: 3, energy: 'low' }, 0);
  await expect(f.actions.saveCheckIn({ date: DAY, mood: 4, energy: 'high' }, 0))
    .rejects.toMatchObject({ code: 'stale_revision' });
  await f.actions.upsertCuratedQuest(quest, 0, boundary);
  await expect(f.actions.upsertCuratedQuest(quest, 0, boundary))
    .rejects.toMatchObject({ code: 'invalid_transition' });
  await f.actions.activateQuest(quest.id, 1);
  await expect(f.actions.completeQuest({ questId: quest.id, expectedRevision: 2,
    proofId: PROOF, idempotencyKey: 'complete-key-0002', now: NOW, localDate: DAY,
    photoUri: '/private/photo.jpg' } as never)).rejects.toMatchObject({ code: 'invalid_arguments' });
  expect(f.verify).not.toHaveBeenCalled();
  await expect(f.actions.completeQuest({ questId: quest.id, expectedRevision: 2,
    proofId: 'missing-proof-0001', idempotencyKey: 'complete-key-0003', now: NOW, localDate: DAY }))
    .rejects.toMatchObject({ code: 'proof_required' });
  expect((await f.quests.get(quest.id))?.quest.status).toBe('active');
  expect((await f.progress.hydrate(NOW)).doc.totalXp).toBe(0);
  await f.db.closeAsync();
});

it('replays a completion once and rejects a changed proof', async () => {
  const f = await fixture(guestNamespace('phase2-replay'));
  await f.actions.upsertCuratedQuest(quest, 0, boundary);
  await f.actions.activateQuest(quest.id, 1);
  const input = { questId: quest.id, expectedRevision: 2, proofId: PROOF,
    idempotencyKey: 'complete-key-0004', now: NOW, localDate: DAY };
  await f.actions.completeQuest(input);
  expect((await f.actions.completeQuest(input)).idempotentReplay).toBe(true);
  expect((await f.progress.hydrate(NOW)).doc.totalXp).toBe(quest.xp);
  await expect(f.actions.completeQuest({ ...input, proofId: 'other-proof-0000001' }))
    .rejects.toMatchObject({ code: 'idempotency_conflict' });
  await f.db.closeAsync();
});

it('repairs a quest persisted before its XP award on the next hydration', async () => {
  const f = await fixture(guestNamespace('phase2-recovery'));
  await f.actions.upsertCuratedQuest(quest, 0, boundary);
  await f.actions.activateQuest(quest.id, 1);
  jest.spyOn(f.progress, 'recordCompletion').mockRejectedValueOnce(new Error('interrupted write'));
  await expect(f.actions.completeQuest({ questId: quest.id, expectedRevision: 2, proofId: PROOF,
    idempotencyKey: 'complete-key-0005', now: NOW, localDate: DAY })).rejects.toMatchObject({ code: 'storage_failure' });
  expect((await f.quests.get(quest.id))?.quest.status).toBe('done');
  const recovered = await new Phase2Actions(f.quests, f.checkIns, f.progress, { verify: f.verify }).hydrate(NOW, DAY);
  expect(recovered.recoveryPendingQuestIds).toEqual([]);
  expect(recovered.progress.doc.totalXp).toBe(quest.xp);
  expect(recovered.earnedToday).toBe(quest.xp);
  await f.db.closeAsync();
});

it('does not award XP for a done row without a verifiable opaque proof', async () => {
  const f = await fixture(guestNamespace('phase2-unverified'));
  await f.quests.put({ ...quest, status: 'done', completedAt: NOW,
    completionLocalDate: DAY, proofId: 'unverified-proof-0001' } as Quest, 0);
  const state = await f.actions.hydrate(NOW, DAY);
  expect(state.recoveryPendingQuestIds).toEqual([quest.id]);
  expect(state.progress.doc.totalXp).toBe(0);
  expect(await f.progress.completion(quest.id)).toBeNull();
  await f.db.closeAsync();
});

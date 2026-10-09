import { QuestService, type QuestState } from '../quest-service';
import { ServiceError, type AtomicStore, type CommandContext, type CommandResult } from '../service-types';
import type { Quest } from '../types';

const quest: Quest = { id: 'q1', source: 'library', kind: 'daily', area: 'focus', title: 'Focus', flavor: '', instruction: 'Do focus', rank: 'S', xp: 120, estMinutes: 10, status: 'active', offeredOn: '2026-10-10' };
class Store implements AtomicStore<QuestState> {
  state: QuestState = { quests: [quest], totalXp: 100, earnedToday: 190, xpDate: '2026-10-10', rerollsUsed: 0, maxRerolls: 1, completedIds: [] };
  revision = '1';
  receipts = new Map<string, { fingerprint: string; result: CommandResult<unknown> }>();
  async transact<T>(context: CommandContext, fingerprint: string, run: (state: Readonly<QuestState>) => { state: QuestState; value: T }): Promise<CommandResult<T>> {
    const receipt = this.receipts.get(context.idempotencyKey);
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) throw new ServiceError('idempotency_conflict', 'Conflict');
      return { ...receipt.result, idempotentReplay: true } as CommandResult<T>;
    }
    if (context.expectedRevision !== this.revision) throw new ServiceError('stale_revision', 'Stale');
    const outcome = run(this.state);
    this.state = outcome.state;
    this.revision = String(Number(this.revision) + 1);
    const result = { value: outcome.value, revision: this.revision, idempotentReplay: false };
    this.receipts.set(context.idempotencyKey, { fingerprint, result });
    return result;
  }
}
const input = { questId: 'q1', proof: { proofId: 'photo-1' }, now: '2026-10-10T10:00:00Z', localDate: '2026-10-10' };

test('completion requires verified app-owned proof and awards capped XP once', async () => {
  const store = new Store();
  const service = new QuestService(store, { verify: async (_, id) => id === 'photo-1' });
  await expect(service.complete({ expectedRevision: '1', idempotencyKey: 'x' }, { ...input, proof: { proofId: '' } })).rejects.toMatchObject({ code: 'proof_required' });
  await expect(service.complete({ expectedRevision: '1', idempotencyKey: 'x' }, { ...input, proof: { proofId: 'photo-1', photoUri: '/secret' } } as never)).rejects.toMatchObject({ code: 'proof_required' });
  const first = await service.complete({ expectedRevision: '1', idempotencyKey: 'x' }, input);
  expect(first.value.xpGranted).toBe(10);
  expect(store.state.totalXp).toBe(110);
  const replay = await service.complete({ expectedRevision: '1', idempotencyKey: 'x' }, input);
  expect(replay.idempotentReplay).toBe(true);
  expect(store.state.totalXp).toBe(110);
  await expect(service.complete({ expectedRevision: '2', idempotencyKey: 'y' }, input)).rejects.toMatchObject({ code: 'invalid_transition' });
});
test('rejects stale revision and reroll conflict', async () => {
  const store = new Store();
  const service = new QuestService(store, { verify: async () => true });
  await expect(service.skip({ expectedRevision: '0', idempotencyKey: 'a' }, 'q1')).rejects.toMatchObject({ code: 'stale_revision' });
  await service.skip({ expectedRevision: '1', idempotencyKey: 'a' }, 'q1');
  await expect(service.skip({ expectedRevision: '2', idempotencyKey: 'a' }, 'other')).rejects.toMatchObject({ code: 'idempotency_conflict' });
});

test('blocks a second physical completion on the same day', async () => {
  const store = new Store();
  const walk = { ...quest, id: 'walk', templateId: 'health-walk', area: 'health' as const, rank: 'D' as const, xp: 20 };
  store.state.quests = [
    walk,
    { ...walk, id: 'previous-walk', status: 'done', completedAt: '2026-10-10T08:00:00Z' },
  ];
  const service = new QuestService(store, { verify: async () => true });
  await expect(service.complete({ expectedRevision: '1', idempotencyKey: 'physical-2' }, { ...input, questId: 'walk' })).rejects.toMatchObject({ code: 'daily_limit' });
});

test('rejects a model-supplied path on completion even if a proof ID is present', async () => {
  const service = new QuestService(new Store(), { verify: async () => true });
  await expect(service.complete({ expectedRevision: '1', idempotencyKey: 'model-path' }, { ...input, photoUri: 'file:///private/photo.jpg' } as never)).rejects.toMatchObject({ code: 'invalid_arguments' });
});

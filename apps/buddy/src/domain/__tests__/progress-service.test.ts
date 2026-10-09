import { ProgressService, type ProgressState } from '../progress-service';
import { ServiceError, type AtomicStore, type CommandContext, type CommandResult } from '../service-types';
class Store implements AtomicStore<ProgressState> {
  state: ProgressState = { totalXp: 500, earnedToday: 190, xpDate: '2026-10-10', awardedEffectIds: [] };
  revision = '0';
  receipts = new Map<string, { fingerprint: string; result: CommandResult<unknown> }>();
  async transact<T>(context: CommandContext, fingerprint: string, run: (state: Readonly<ProgressState>) => { state: ProgressState; value: T }): Promise<CommandResult<T>> {
    const receipt = this.receipts.get(context.idempotencyKey);
    if (receipt) {
      if (receipt.fingerprint !== fingerprint) throw new ServiceError('idempotency_conflict', 'Conflict');
      return { ...receipt.result, idempotentReplay: true } as CommandResult<T>;
    }
    if (this.revision !== context.expectedRevision) throw new ServiceError('stale_revision', 'Stale');
    const next = run(this.state); this.state = next.state; this.revision = String(Number(this.revision) + 1);
    const result = { value: next.value, revision: this.revision, idempotentReplay: false };
    this.receipts.set(context.idempotencyKey, { fingerprint, result });
    return result;
  }
}
test('caps daily XP with persisted state and never awards an effect twice', async () => {
  const store = new Store(); const service = new ProgressService(store);
  expect((await service.award({ expectedRevision: '0', idempotencyKey: 'a' }, 'quest-1', 120, '2026-10-10')).value.granted).toBe(10);
  expect(store.state.totalXp).toBe(510);
  expect((await service.award({ expectedRevision: '0', idempotencyKey: 'a' }, 'quest-1', 120, '2026-10-10')).idempotentReplay).toBe(true);
  await expect(service.award({ expectedRevision: '1', idempotencyKey: 'b' }, 'quest-1', 120, '2026-10-10')).rejects.toMatchObject({ code: 'invalid_transition' });
  expect((await service.award({ expectedRevision: '1', idempotencyKey: 'c' }, 'quest-2', 120, '2026-10-10')).value.granted).toBe(0);
  expect((await service.award({ expectedRevision: '2', idempotencyKey: 'd' }, 'quest-3', 120, '2026-10-11')).value.granted).toBe(120);
  await expect(service.award({ expectedRevision: '3', idempotencyKey: 'e' }, 'quest-4', -1, '2026-10-11')).rejects.toMatchObject({ code: 'invalid_arguments' });
});

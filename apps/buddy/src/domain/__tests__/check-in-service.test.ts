import { CheckInService, type CheckInState } from '../check-in-service';
import { ServiceError, type AtomicStore, type CommandContext, type CommandResult } from '../service-types';

class Store implements AtomicStore<CheckInState> {
  state: CheckInState = { checkIns: [] };
  revision = '0';
  async transact<T>(context: CommandContext, _fingerprint: string, run: (state: Readonly<CheckInState>) => { state: CheckInState; value: T }): Promise<CommandResult<T>> {
    if (context.expectedRevision !== this.revision) throw new ServiceError('stale_revision', 'Stale');
    const next = run(this.state); this.state = next.state; this.revision = String(Number(this.revision) + 1);
    return { value: next.value, revision: this.revision, idempotentReplay: false };
  }
}
test('one check-in per day updates the same record', async () => {
  const store = new Store(); const service = new CheckInService(store);
  expect((await service.upsert({ expectedRevision: '0', idempotencyKey: 'a' }, { date: '2026-10-10', mood: 3, energy: 'low' })).value.effect).toBe('created');
  expect((await service.upsert({ expectedRevision: '1', idempotencyKey: 'b' }, { date: '2026-10-10', mood: 4, energy: 'high' })).value.effect).toBe('updated');
  expect(store.state.checkIns).toHaveLength(1);
  expect(store.state.checkIns[0].mood).toBe(4);
  await expect(service.upsert({ expectedRevision: '2', idempotencyKey: 'c' }, { date: 'bad', mood: 4, energy: 'high' })).rejects.toMatchObject({ code: 'invalid_arguments' });
});

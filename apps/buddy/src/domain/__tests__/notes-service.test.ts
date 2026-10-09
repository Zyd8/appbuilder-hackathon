import { NotesService, type NotesState } from '../notes-service';
import { ServiceError, type AtomicStore, type CommandContext, type CommandResult } from '../service-types';

class Store implements AtomicStore<NotesState> {
  state: NotesState = { notes: [] };
  revision = '0';
  receipts = new Map<string, { fingerprint: string; result: CommandResult<unknown> }>();
  fail = false;
  async transact<T>(context: CommandContext, fingerprint: string, run: (state: Readonly<NotesState>) => { state: NotesState; value: T }): Promise<CommandResult<T>> {
    if (this.fail) throw new ServiceError('storage_failure', 'Disk unavailable');
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
test('creates a normalized note once and returns an app-owned read-back ID', async () => {
  const store = new Store(); let ids = 0;
  const service = new NotesService(store, { next: () => `note-${++ids}` }, { now: () => '2026-10-10T08:00:00Z' });
  const context = { expectedRevision: '0', idempotencyKey: 'create-1' };
  const result = await service.create(context, { body: '  Buy milk\r\n tomorrow  ', date: '2026-10-11' });
  expect(result.value).toMatchObject({ id: 'note-1', effect: 'created', note: { body: 'Buy milk\n tomorrow', done: false } });
  expect((await service.create(context, { body: '  Buy milk\r\n tomorrow  ', date: '2026-10-11' })).idempotentReplay).toBe(true);
  expect(ids).toBe(1);
  await expect(service.create(context, { body: 'Changed' })).rejects.toMatchObject({ code: 'idempotency_conflict' });
  const done = await service.setDone({ expectedRevision: '1', idempotencyKey: 'done' }, 'note-1', true);
  expect(done.value.note.done).toBe(true);
  expect((await service.setDone({ expectedRevision: '2', idempotencyKey: 'done-again' }, 'note-1', true)).value.effect).toBe('unchanged');
});
test('validates body and propagates storage failures', async () => {
  const store = new Store(); const service = new NotesService(store, { next: () => 'id' }, { now: () => '2026-10-10T08:00:00Z' });
  const context = { expectedRevision: '0', idempotencyKey: 'a' };
  await expect(service.create(context, { body: '   ' })).rejects.toMatchObject({ code: 'invalid_arguments' });
  await expect(service.create(context, { body: 'x'.repeat(2001) })).rejects.toMatchObject({ code: 'invalid_arguments' });
  await expect(service.create(context, { body: 'Valid', date: '2026-02-30' })).rejects.toMatchObject({ code: 'invalid_arguments' });
  store.fail = true;
  await expect(service.create(context, { body: 'Valid' })).rejects.toMatchObject({ code: 'storage_failure' });
});

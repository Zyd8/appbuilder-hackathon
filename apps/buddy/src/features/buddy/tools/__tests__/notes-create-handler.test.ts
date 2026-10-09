/// <reference types="jest" />
import type { BuddyReadPorts, BuddyWritePorts, ReadSnapshot } from '../../contracts/domain-ports';
import type { Note } from '@/domain/types';
import { NotesCreateHandler } from '../notes-create-handler';
import type { ValidatedWriteCall } from '../tool-types';

const NOW = '2026-10-10T10:00:00Z';
const call: ValidatedWriteCall = { id: 'c1', name: 'notes.create', arguments: {
  body: '  Call dentist  ', expectedRevision: '0', idempotencyKey: 'safe-key-1234567890', priority: 'high',
} };

function fixture() {
  let revision = '0';
  let note: Note | null = null;
  let receipt: { id: string; revision: string; body: string; priority: Note['priority'] } | null = null;
  let durability: 'durable' | 'preview' = 'durable';
  let mismatch = false;
  const snap = <T>(value: T): ReadSnapshot<T> => ({ value, revision, observedAt: NOW,
    provenance: 'local notes', durability, schemaVersion: 1 });
  const create = jest.fn(async () => {
    if (receipt) return { id: receipt.id, revision: receipt.revision, idempotentReplay: true };
    note = { id: 'n1', body: 'Call dentist', priority: 'high', done: false, createdAt: NOW, updatedAt: NOW };
    revision = '1'; receipt = { id: 'n1', revision, body: note.body, priority: note.priority };
    return { id: 'n1', revision, idempotentReplay: false };
  });
  const reads = { notes: { list: async () => snap(note ? [note] : []),
    byId: async () => snap(mismatch ? { ...note, body: 'wrong' } : note),
    createReceipt: async () => snap(receipt) } } as unknown as BuddyReadPorts;
  const writes = { notes: { create } } as unknown as BuddyWritePorts;
  const handler = new NotesCreateHandler(reads, writes, { now: () => NOW });
  return { handler, create, setRevision: (value: string) => { revision = value; },
    setDurability: (value: 'durable' | 'preview') => { durability = value; },
    setMismatch: () => { mismatch = true; }, reads, writes };
}

it('prepares an exact preview without writing, then verifies durable read-back', async () => {
  const state = fixture();
  const pending = await state.handler.prepare(call);
  expect('descriptor' in pending && pending.descriptor.body).toBe('Call dentist');
  expect(state.create).not.toHaveBeenCalled();
  if (!('descriptor' in pending)) throw new Error('Expected pending confirmation');
  const result = await state.handler.execute(pending);
  expect(result).toMatchObject({ ok: true, data: { id: 'n1', body: 'Call dentist' },
    metadata: { durability: 'durable', confirmation: 'confirmed' } });
  expect(state.create).toHaveBeenCalledTimes(1);
});

it('rejects new stale keys and preview state before confirmation', async () => {
  const state = fixture(); state.setRevision('2');
  expect(await state.handler.prepare(call)).toMatchObject({ ok: false, error: { code: 'stale_revision' } });
  state.setDurability('preview');
  expect(await state.handler.prepare(call)).toMatchObject({ ok: false, error: { code: 'preview_only' } });
  expect(state.create).not.toHaveBeenCalled();
});

it('returns read-back failure rather than claiming a write succeeded', async () => {
  const state = fixture(); state.setMismatch();
  const pending = await state.handler.prepare(call);
  if (!('descriptor' in pending)) throw new Error('Expected pending confirmation');
  expect(await state.handler.execute(pending)).toMatchObject({ ok: false, error: { code: 'read_back_failed' } });
});

it('reports a storage failure without a success result', async () => {
  const state = fixture();
  state.create.mockRejectedValueOnce(new Error('disk error'));
  const pending = await state.handler.prepare(call);
  if (!('descriptor' in pending)) throw new Error('Expected pending confirmation');
  expect(await state.handler.execute(pending)).toMatchObject({ ok: false, error: { code: 'storage_failure' } });
});

it('allows a matching durable receipt to replay after controller recreation', async () => {
  const state = fixture();
  const first = await state.handler.prepare(call);
  if (!('descriptor' in first)) throw new Error('Expected pending confirmation');
  expect((await state.handler.execute(first)).ok).toBe(true);
  const restarted = new NotesCreateHandler(state.reads, state.writes, { now: () => NOW });
  const replay = await restarted.prepare({ ...call, id: 'c2' });
  if (!('descriptor' in replay)) throw new Error('Expected replay confirmation');
  expect((await restarted.execute(replay)).ok).toBe(true);
  expect(state.create).toHaveBeenCalledTimes(2);
  expect(await restarted.prepare({ ...call, id: 'c3', arguments: { ...call.arguments, body: 'Different' } }))
    .toMatchObject({ ok: false, error: { code: 'idempotency_conflict' } });
});

import { NotesService } from '@/domain/notes-service';
import { loadNotes, writeNotes } from '@/lib/notes-storage';

import { createBuddyReadPorts, LocalNotesAtomicStore } from '../domain-adapters';
import type { DomainAdapterDependencies } from '../domain-adapters';

const stored = new Map<string, string>();
jest.mock('expo-sqlite/localStorage/install', () => ({}));

beforeEach(() => {
  stored.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => { stored.set(key, value); },
      removeItem: (key: string) => { stored.delete(key); },
    },
  });
});

it('persists a note and its idempotency receipt in the same device document', async () => {
  let idCalls = 0;
  const service = new NotesService(new LocalNotesAtomicStore('account-1'),
    { next: () => { idCalls++; return '00000000-0000-4000-8000-000000000001'; } },
    { now: () => '2026-10-10T00:00:00.000Z' });
  const context = { expectedRevision: '0', idempotencyKey: 'create-note-key-0001' };
  const first = await service.create(context, { body: '  Call dentist  ' });
  const replay = await service.create(context, { body: '  Call dentist  ' });
  expect(first.revision).toBe('1');
  expect(replay.idempotentReplay).toBe(true);
  expect(idCalls).toBe(1);
  expect(loadNotes('account-1').notes[0].body).toBe('Call dentist');
  await expect(service.create(context, { body: 'Different task' })).rejects.toMatchObject({ code: 'idempotency_conflict' });
});

it('changes collection revision when the existing Notes UI writes', async () => {
  const service = new NotesService(new LocalNotesAtomicStore('account-1'),
    { next: () => '00000000-0000-4000-8000-000000000002' },
    { now: () => '2026-10-10T00:00:00.000Z' });
  writeNotes(loadNotes('account-1'));
  expect(loadNotes('account-1').agentRevision).toBe(1);
  await expect(service.create({ expectedRevision: '0', idempotencyKey: 'create-note-key-0002' },
    { body: 'Read book' })).rejects.toMatchObject({ code: 'stale_revision' });
});

it('reads persisted profile, quests and notes through typed ports', async () => {
  const profile = { revision: 'pa1', stats: { focus: 80 }, insights: [{ id: 'i1' }, { id: 'i2' }] };
  const quest = { id: 'q1', title: 'Focus', status: 'offered' };
  writeNotes(loadNotes('account-1'));
  const deps = {
    namespace: 'account:account-1', now: () => '2026-10-10T00:00:00.000Z',
    profile: { read: async () => profile },
    quests: { list: async () => [{ quest, revision: 1 }], get: async () => ({ quest, revision: 1 }) },
    checkIn: { latest: async () => null },
    progress: { hydrate: async () => ({ doc: { totalXp: 25, updatedAt: 'r1' }, level: 2, rank: 'E' }) },
    memory: { readAll: async () => [] },
    model: { status: async () => ({ value: {}, revision: 'r1', observedAt: 't', provenance: 'test', durability: 'session', schemaVersion: 1 }) },
    input: { capabilities: async () => ({ value: { text: true, image: false, audio: false }, revision: 'r1', observedAt: 't', provenance: 'test', durability: 'session', schemaVersion: 1 }) },
  } as unknown as DomainAdapterDependencies;
  const ports = createBuddyReadPorts(deps);
  expect((await ports.profile.current()).value?.revision).toBe('pa1');
  expect((await ports.quests.board()).value[0].id).toBe('q1');
  expect((await ports.progress.xpLevelRank()).value.totalXp).toBe(25);
  expect((await ports.notes.list()).durability).toBe('durable');
});

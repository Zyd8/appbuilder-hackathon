/// <reference types="jest" />
import { loadNotes } from '@/lib/notes-storage';
import type { AIEngine, AIEngineOutput } from '../contracts/ai-engine';
import type { DomainAdapterDependencies } from '../adapters/domain-adapters';
import { createBuddyReadPorts, createBuddyWritePorts } from '../adapters/domain-adapters';
import { BuddyChatController } from '../buddy-chat-controller';
import type { MemoryRepository } from '../memory/memory-repository';

jest.mock('expo-sqlite/localStorage/install', () => ({}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000123' }));

const stored = new Map<string, string>();
const NOW = '2026-10-10T10:00:00.000Z';
const namespace = 'account:vertical-test' as const;
const tool = (id: string, name: string, args: unknown = {}): AIEngineOutput => ({ kind: 'toolCall',
  toolCall: { id, name, arguments: args } });

beforeEach(() => {
  stored.clear();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true,
    value: { getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => { stored.set(key, value); },
      removeItem: (key: string) => { stored.delete(key); } } });
});

function fixture(script: AIEngineOutput[]) {
  const generate = jest.fn(async () => script.shift() ?? { kind: 'final', text: 'Done.' } as AIEngineOutput);
  const engine = { readiness: async () => 'ready', initialize: async () => ({ text: true,
    vision: false, audio: false, functionCalling: true, contextTokens: 4096 }), generate,
    cancel: async () => {}, dispose: async () => {}, capabilities: () => null } as AIEngine;
  const memory = { readAll: async () => [
    { name: 'BOT.md', text: '# BOT', revision: '1' }, { name: 'USER.md', text: '# USER', revision: '1' },
  ] } as unknown as MemoryRepository;
  const runtime = { model: { status: async () => ({ value: { selectedId: 'gemma4-e2b', readiness: 'ready' },
    revision: '1', observedAt: NOW, provenance: 'local runtime', durability: 'session', schemaVersion: 1 }) },
    input: { capabilities: async () => ({ value: { text: true, image: false, audio: false }, revision: '1',
      observedAt: NOW, provenance: 'local runtime', durability: 'session', schemaVersion: 1 }) } };
  const deps = { namespace, profile: { read: async () => null }, quests: { list: async () => [], get: async () => null },
    checkIn: { latest: async () => null }, progress: { hydrate: async () => ({ doc: { totalXp: 0,
      updatedAt: NOW }, level: 1, rank: 'E' }) }, memory, ...runtime, now: () => NOW } as unknown as DomainAdapterDependencies;
  const reads = createBuddyReadPorts(deps);
  const controller = new BuddyChatController(memory, engine, reads, createBuddyWritePorts(namespace));
  return { controller, reads, generate };
}

it('reads current notes, confirms exactly one local todo, then reopens its durable document', async () => {
  const f = fixture([tool('read', 'notes.read'), tool('save', 'notes.create', {
    body: 'Call dentist', expectedRevision: '0', idempotencyKey: 'vertical-create-0001',
  }), tool('read-back', 'notes.read', { id: '00000000-0000-4000-8000-000000000123' }),
  { kind: 'final', text: '<think>private</think>Buddy: I saved Call dentist.' }]);
  const pending = await f.controller.start({ modelId: 'gemma4-e2b',
    history: [{ role: 'user', text: 'Add a todo to call dentist' }] });
  expect(pending.state).toBe('pending');
  expect(loadNotes('vertical-test').notes).toHaveLength(0);
  if (pending.state !== 'pending') throw new Error('Expected a confirmation');
  const completed = await f.controller.decide(pending.confirmation.callId, 'confirm');
  expect(completed).toMatchObject({ state: 'complete', answer: 'I saved Call dentist.' });
  expect(completed.summary).toContain('notes.create: succeeded.');
  expect(completed.summary).toContain('notes.read: succeeded.');
  expect(loadNotes('vertical-test').notes).toHaveLength(1);
  const persisted = loadNotes('vertical-test');
  expect(persisted.notes[0]).toMatchObject({ body: 'Call dentist', done: false });
  expect(persisted.agentRevision).toBe(1);
  const reopened = fixture([]);
  expect((await reopened.reads.notes.byId(persisted.notes[0].id)).value?.body).toBe('Call dentist');
  expect((await reopened.reads.notes.list()).revision).toBe('1');
  expect(f.generate).toHaveBeenCalledTimes(4);
});

it('declining consent leaves the durable document unchanged', async () => {
  const f = fixture([tool('save', 'notes.create', { body: 'Call dentist', expectedRevision: '0',
    idempotencyKey: 'vertical-create-0002' }), { kind: 'final', text: 'I saved it.' }]);
  const pending = await f.controller.start({ modelId: 'gemma4-e2b',
    history: [{ role: 'user', text: 'Add a todo' }] });
  if (pending.state !== 'pending') throw new Error('Expected a confirmation');
  const rejected = await f.controller.decide(pending.confirmation.callId, 'reject');
  expect(rejected.state).toBe('stopped');
  expect(loadNotes('vertical-test').notes).toHaveLength(0);
  expect(f.generate).toHaveBeenCalledTimes(1);
});

/// <reference types="jest" />
jest.mock('expo-sqlite/localStorage/install', () => ({}));
import type { Note } from '@/domain/types';
import type { AIEngine, AIEngineOutput } from '../contracts/ai-engine';
import type { BuddyReadPorts, BuddyWritePorts, ReadSnapshot } from '../contracts/domain-ports';
import { BuddyChatController } from '../buddy-chat-controller';
import type { MemoryRepository } from '../memory/memory-repository';

const NOW = '2026-10-10T10:00:00.000Z';
const snapshot = <T>(value: T, revision = '0'): ReadSnapshot<T> => ({
  value, revision, observedAt: NOW, provenance: 'on-device fixture', durability: 'durable', schemaVersion: 1,
});
const tool = (id: string, name: string, args: unknown = {}): AIEngineOutput => ({ kind: 'toolCall',
  toolCall: { id, name, arguments: args } });

function fixture(script: AIEngineOutput[]) {
  let note: Note | null = null;
  let revision = '0';
  const generate = jest.fn(async () => script.shift() ?? { kind: 'final', text: 'Done.' } as AIEngineOutput);
  const engine = { readiness: async () => 'ready', initialize: async () => ({ text: true,
    vision: false, audio: false, functionCalling: true, contextTokens: 4096 }), generate,
    cancel: async () => {}, dispose: async () => {}, capabilities: () => null } as AIEngine;
  const read = async () => snapshot(null);
  const reads = { onboarding: { context: read }, profile: { current: read },
    quests: { board: read, history: read, detail: read }, checkIn: { current: read },
    progress: { xpLevelRank: read, statsSummary: read, statsBreakdown: read, orderedInsights: read,
      currentNudge: read },
    notes: { list: async () => snapshot(note ? [note] : [], revision),
      byId: async () => snapshot(note, revision), createReceipt: async () => snapshot(null, revision) },
    memory: { documents: read }, model: { status: read }, input: { capabilities: read } } as unknown as BuddyReadPorts;
  const create = jest.fn(async () => {
    note = { id: 'note-1', body: 'Call dentist', priority: 'normal', done: false,
      createdAt: NOW, updatedAt: NOW };
    revision = '1';
    return { id: 'note-1', revision, idempotentReplay: false };
  });
  const writes = { notes: { create } } as BuddyWritePorts;
  const memory = { readAll: async () => [
    { name: 'BOT.md', text: '# BOT\nHelpful', revision: '1', bytes: 20, managedEntries: [] },
    { name: 'USER.md', text: '# USER\nLocal', revision: '1', bytes: 20, managedEntries: [] },
  ] } as unknown as MemoryRepository;
  const controller = new BuddyChatController(memory, engine, reads, writes);
  return { controller, generate, create, getNote: () => note };
}

it('presents confirmed local note read-back separately from a clean answer', async () => {
  const f = fixture([tool('read', 'notes.read'), tool('save', 'notes.create', {
    body: 'Call dentist', expectedRevision: '0', idempotencyKey: 'safe-key-1234567890',
  }), { kind: 'final', text: '<think>internal</think>Buddy: Your todo is saved.' }]);
  const pending = await f.controller.start({ modelId: 'gemma4-e2b',
    history: [{ role: 'user', text: 'Add a todo to call dentist' }] });
  expect(pending.state).toBe('pending');
  expect(f.create).not.toHaveBeenCalled();
  expect(f.getNote()).toBeNull();
  if (pending.state !== 'pending') throw new Error('Expected confirmation');
  expect(pending.confirmation.body).toBe('Call dentist');
  const answer = await f.controller.decide(pending.confirmation.callId, 'confirm');
  expect(answer).toMatchObject({ state: 'complete', answer: 'Your todo is saved.' });
  expect(answer.summary).toContain('notes.create: succeeded.');
  expect(JSON.stringify(answer)).not.toContain('<think>');
  expect(f.create).toHaveBeenCalledTimes(1);
  expect(f.getNote()).toMatchObject({ body: 'Call dentist' });
});

it('keeps rejection app-owned and never samples a false model final', async () => {
  const f = fixture([tool('save', 'notes.create', { body: 'Call dentist', expectedRevision: '0',
    idempotencyKey: 'safe-key-1234567890' }), { kind: 'final', text: 'I saved it.' }]);
  const pending = await f.controller.start({ modelId: 'gemma4-e2b',
    history: [{ role: 'user', text: 'Add a todo' }] });
  if (pending.state !== 'pending') throw new Error('Expected confirmation');
  const rejected = await f.controller.decide(pending.confirmation.callId, 'reject');
  expect(rejected.state).toBe('stopped');
  expect(f.create).not.toHaveBeenCalled();
  expect(f.generate).toHaveBeenCalledTimes(1);
});

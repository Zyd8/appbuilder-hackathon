/// <reference types="jest" />
import type { BuddyReadPorts, ReadSnapshot } from '../../contracts/domain-ports';
import { READ_TOOL_NAMES } from '../../contracts/tool-protocol';
import { executeRead } from '../read-handlers';
import type { ValidatedReadCall } from '../tool-types';

const snapshot = (value: unknown, durability: 'durable' | 'preview' = 'durable'): ReadSnapshot<unknown> => ({
  value, revision: 'r1', observedAt: '2026-10-10T10:00:00Z', provenance: 'test repository', durability, schemaVersion: 1,
});

const read = jest.fn(async () => snapshot({ answer: 'local' }));
const ports = {
  onboarding: { context: read }, profile: { current: read },
  quests: { board: read, history: read, detail: read }, checkIn: { current: read },
  progress: { xpLevelRank: read, statsSummary: read, statsBreakdown: read, orderedInsights: read, currentNudge: read },
  notes: { list: read, byId: read }, memory: { documents: read }, model: { status: read },
  input: { capabilities: read },
} as unknown as BuddyReadPorts;

it.each(READ_TOOL_NAMES)('dispatches %s through a typed read port', async (name) => {
  read.mockClear();
  const result = await executeRead({ id: 'c1', name, arguments: name === 'quests.detail.read' ? { id: 'q1' } : {} } as ValidatedReadCall,
    ports, () => '2026-10-10T10:00:00Z');
  expect(read).toHaveBeenCalledTimes(1);
  expect(result).toMatchObject({ ok: true, name, metadata: { source: name, revision: 'r1',
    provenance: 'test repository', durability: 'durable', execution: 'local', truncated: false } });
});

it('redacts private URI fields and preserves preview durability honestly', async () => {
  const preview = { ...ports, quests: { ...ports.quests, board: async () => snapshot([{ id: 'q', photoUri: '/private/photo.jpg' }], 'preview') } };
  const result = await executeRead({ id: 'c1', name: 'quests.board.read', arguments: {} }, preview as unknown as BuddyReadPorts,
    () => '2026-10-10T10:00:00Z');
  expect(result).toMatchObject({ ok: true, data: [{ id: 'q' }], metadata: { durability: 'preview', truncated: true } });
  expect(JSON.stringify(result)).not.toContain('/private/photo.jpg');
});

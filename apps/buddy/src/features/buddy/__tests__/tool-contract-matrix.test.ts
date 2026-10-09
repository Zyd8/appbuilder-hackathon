/// <reference types="jest" />
import { READ_TOOL_NAMES } from '../contracts/tool-protocol';
import { DISABLED_WRITE_TOOLS, modelToolDefinitions, TOOL_MANIFEST } from '../tools/tool-registry';
import { validateToolCall } from '../tools/tool-schemas';
import { readResult } from '../tools/tool-result';

const NOW = '2026-10-10T10:00:00Z';

test('the native tool manifest covers every enabled read and only one write', () => {
  expect(TOOL_MANIFEST.map((entry) => [entry.name, entry.permission])).toEqual([
    ...READ_TOOL_NAMES.map((name) => [name, 'read-local']),
    ['notes.create', 'always-confirmed-sensitive-write'],
  ]);
  const native = modelToolDefinitions();
  expect(native.map((entry) => entry.function.name)).toEqual(TOOL_MANIFEST.map((entry) => entry.name));
  expect(native.every((entry) => entry.function.parameters.additionalProperties === false)).toBe(true);
  for (const name of READ_TOOL_NAMES) {
    const args = name === 'quests.detail.read' ? { id: 'q1' } : {};
    expect(validateToolCall({ id: 'c1', name, arguments: args }).ok).toBe(true);
  }
});

test('all deferred and privileged names stay outside the executable registry', () => {
  const forbidden = [...DISABLED_WRITE_TOOLS, 'notes.update', 'assessment.set', 'stats.set', 'xp.grant',
    'widget.refresh', 'share.export', 'audio.play', 'attachment.uri.read', 'network.fetch',
    'cloud.query', 'supabase.rpc', 'sqlite.execute', 'shell.run', 'filesystem.read'];
  for (const name of forbidden) {
    expect(TOOL_MANIFEST.some((entry) => String(entry.name) === name)).toBe(false);
    expect(validateToolCall({ id: 'c1', name, arguments: {} })).toMatchObject({ ok: false, code: 'invalid_tool' });
  }
});

test('read results carry source, version, revision, provenance, durability and execution metadata', () => {
  for (const name of READ_TOOL_NAMES) {
    const result = readResult('c1', name, { value: { sourceRow: 1 }, revision: 'r7', observedAt: NOW,
      provenance: 'local repository', durability: 'durable', schemaVersion: 2 });
    expect(result).toMatchObject({ ok: true, callId: 'c1', name,
      metadata: { source: name, schemaVersion: 2, serviceVersion: 'buddy-tools/1', revision: 'r7',
        observedAt: NOW, freshness: 'current', provenance: 'local repository', durability: 'durable',
        execution: 'local', confirmation: 'not-required', truncated: false } });
  }
});

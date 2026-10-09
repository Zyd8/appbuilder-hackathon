/// <reference types="jest" />
import { parseModelEnvelope, validateToolCall } from '../tool-schemas';

const note = { body: 'Call the dentist', expectedRevision: '0', idempotencyKey: 'safe-key-1234567890' };
const call = (name: string, args: unknown) => ({ id: 'call1', name, arguments: args });

describe('tool schemas', () => {
  it('accepts exact read and note calls', () => {
    expect(validateToolCall(call('profile.read', {})).ok).toBe(true);
    expect(validateToolCall(call('quests.detail.read', { id: 'q1' })).ok).toBe(true);
    expect(validateToolCall(call('notes.create', note)).ok).toBe(true);
  });

  it.each(['notes.delete', 'progress.award', 'stats.set', 'widget.refresh', 'share.export',
    'audio.play', 'network.fetch', 'cloud.query', 'filesystem.read', 'sql.execute', 'model.install'])
  ('rejects disabled tool %s', (name) => {
    expect(validateToolCall(call(name, {}))).toMatchObject({ ok: false, code: 'invalid_tool' });
  });

  it('rejects unknown, duplicate, deep, malformed, path, and large arguments', () => {
    expect(validateToolCall(call('profile.read', { prefix: 'profile' })).ok).toBe(false);
    expect(validateToolCall(call('notes.create', { ...note, photoUri: '/private/photo.jpg' })).ok).toBe(false);
    expect(validateToolCall(call('notes.create', { ...note, date: '2026-02-30' })).ok).toBe(false);
    expect(validateToolCall(call('notes.create', '{"body":"a","body":"b","expectedRevision":"0","idempotencyKey":"safe-key-1234567890"}'))).toMatchObject({ ok: false, code: 'invalid_arguments' });
    expect(validateToolCall(call('notes.create', '{bad')).ok).toBe(false);
    expect(validateToolCall(call('notes.create', { ...note, body: 'x'.repeat(17000) })).ok).toBe(false);
    expect(validateToolCall(call('notes.create', { ...note, extra: { x: { x: { x: { x: { x: { x: 1 } } } } } } })).ok).toBe(false);
    expect(validateToolCall({ ...call('notes.create', note), extra: true }).ok).toBe(false);
  });

  it('requires one clean model envelope', () => {
    expect(parseModelEnvelope({ kind: 'final', text: 'Done.' })).toEqual({ kind: 'final', text: 'Done.' });
    expect(parseModelEnvelope({ kind: 'toolCall', toolCall: call('profile.read', {}) })).not.toBeNull();
    expect(parseModelEnvelope({ kind: 'toolCall', toolCall: call('notes.delete', {}) })).toBeNull();
    expect(parseModelEnvelope({ kind: 'final', text: 'Done.', toolCall: call('profile.read', {}) })).toBeNull();
    expect(parseModelEnvelope({ kind: 'final', text: 'Done. {"name":"notes.create","arguments":{}}' })).toBeNull();
    expect(parseModelEnvelope('{"kind":"final","text":"Yes"} trailing')).toBeNull();
    expect(parseModelEnvelope('{"kind":"final","text":"Yes","text":"No"}')).toBeNull();
  });
});

/// <reference types="jest" />
import { normalizeAssistantOutput } from '../response-normalizer';

const ACCEPTED: readonly [string, string, string][] = [
  ['complete reasoning', '<think>private reasoning</think>Buddy: Start with one task.', 'Start with one task.'],
  ['repeated reasoning', '<think>first</think><think>second</think>Assistant: Kumusta!', 'Kumusta!'],
  ['unterminated reasoning', 'A safe answer.<think>private remainder', 'A safe answer.'],
  ['speaker prefixes', 'Buddy: Assistant: Buddy: One step.', 'One step.'],
  ['prompt echo', 'System: hidden policy\nUser: hi\nBuddy: Hello', 'Hello'],
  ['standalone tool object', 'Done. {"name":"notes.create","arguments":{"body":"secret"}}', 'Done.'],
  ['fenced tool object', 'Ready.\n```json\n{"toolCall":{"name":"notes.create"}}\n```', 'Ready.'],
  ['unicode and lines', 'Buddy: Kumusta 🌟\nTry a five-minute task.', 'Kumusta 🌟\nTry a five-minute task.'],
];

test.each(ACCEPTED)('%s keeps only the answer', (_name, raw, expected) => {
  expect(normalizeAssistantOutput(raw)).toEqual({ ok: true, answer: expected });
});

test.each([
  ['reasoning only', '<think>private reasoning</think>'],
  ['unfinished reasoning only', '<think>private reasoning'],
  ['empty', '  '],
  ['orphaned think close', '</think>answer'],
])('%s fails closed', (_name, raw) => {
  expect(normalizeAssistantOutput(raw).ok).toBe(false);
});

test('structured mixed output and tool calls do not become visible answers', () => {
  expect(normalizeAssistantOutput({ kind: 'final', text: 'Done', toolCall: { id: 'c1' } } as never).ok).toBe(false);
  expect(normalizeAssistantOutput({ kind: 'toolCall', toolCall: { id: 'c1', name: 'notes.create', arguments: {} } }).ok).toBe(false);
});

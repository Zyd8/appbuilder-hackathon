import { normalizeAssistantOutput } from '../response-normalizer';

test.each([
  ['complete think', '<think>secret</think>Buddy: Hello', 'Hello'],
  ['multiple thinks', '<think>first</think>Assistant: <think>second</think>Okay', 'Okay'],
  ['unterminated think', 'Visible <think>secret', 'Visible'],
  ['duplicate prefixes', 'Buddy: Assistant: Hello', 'Hello'],
  ['Unicode multiline', 'Buddy: Kumusta! 🌟\nTake one step.', 'Kumusta! 🌟\nTake one step.'],
  ['echoed roles', 'System: rules\nUser: hi\nBuddy: Hello', 'Hello'],
  ['standalone tool JSON mixed', 'Done. {"name":"notes.create","arguments":{"body":"secret"}}', 'Done.'],
  ['fenced tool JSON mixed', 'Done.\n```json\n{"toolCall":{"name":"notes.create","arguments":{"body":"secret"}}}\n```', 'Done.'],
])('%s is cleaned', (_label, raw, expected) => {
  expect(normalizeAssistantOutput(raw)).toEqual({ ok: true, answer: expected });
});
test('rejects raw protocol, empty and malformed output', () => {
  expect(normalizeAssistantOutput({ kind: 'toolCall', toolCall: { id: '1', name: 'notes.create', arguments: {} } })).toMatchObject({ ok: false });
  expect(normalizeAssistantOutput('<think>secret</think>')).toEqual({ ok: false, reason: 'empty' });
  expect(normalizeAssistantOutput({ kind: 'final', text: 'hello', toolCall: {} } as never)).toEqual({ ok: false, reason: 'malformed' });
});
test('removes a complete prompt echo', () => {
  expect(normalizeAssistantOutput('PROMPT\nBuddy: answer', 'PROMPT')).toEqual({ ok: true, answer: 'answer' });
});

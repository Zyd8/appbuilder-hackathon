import { presentAgentResponse, presentChat } from '../chat-presenter';

test('keeps factual summary separate from clean final answer', () => {
  const presented = presentChat({ ok: true, answer: 'Done.' }, [{ label: 'notes.create', outcome: 'succeeded' }]);
  expect(presented).toEqual({ summary: ['notes.create: succeeded.'], answer: 'Done.', state: 'complete' });
});
test('reports cancellation and malformed output honestly', () => {
  expect(presentChat({ ok: false, reason: 'malformed' }).state).toBe('failed');
  expect(presentChat({ ok: true, answer: 'ignored' }, [], 'stopped').answer).toContain('Stopped');
});
test('does not pass raw reasoning or tool JSON through the agent response', () => {
  const presented = presentAgentResponse({ whatIChecked: ['<think>secret</think>', 'Read local notes'], finalAnswer: '<think>private</think>Buddy: Ready', toolResults: [], state: 'complete' });
  expect(JSON.stringify(presented)).not.toContain('secret');
  expect(JSON.stringify(presented)).not.toContain('private');
  expect(presented.summary).toEqual(['Read local notes']);
  expect(presented.answer).toBe('Ready');
});

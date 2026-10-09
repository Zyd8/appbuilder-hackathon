/// <reference types="jest" />
import { summarizeProgress } from '@/domain/progress-share';
import type { Quest } from '@/domain/types';
import { presentAgentResponse } from '../chat-presenter';
import { readResult } from '../tools/tool-result';

const NOW = '2026-10-10T10:00:00Z';
const SECRET = 'PRIVATE_SENTINEL_DO_NOT_DISPLAY';

test('the presentation shows observed tool names without exposing local tool data or audit contents', () => {
  const result = readResult('c1', 'notes.read', { value: [{ id: 'n1', body: SECRET,
    photoUri: `/private/${SECRET}.jpg`, audit: { rawPrompt: SECRET } }], revision: '1',
    observedAt: NOW, provenance: 'local notes', durability: 'durable', schemaVersion: 1 });
  const presented = presentAgentResponse({ whatIChecked: [],
    finalAnswer: `<think>${SECRET}</think>Buddy: I checked local notes.`, toolResults: [result], state: 'complete' });
  expect(presented).toEqual({ summary: ['notes.read: succeeded.'], answer: 'I checked local notes.', state: 'complete' });
  expect(JSON.stringify(presented)).not.toContain(SECRET);
});

test('the share summary derives only counts, dates, XP and area from quest history', () => {
  const quest = { status: 'done', completedAt: NOW, xp: 10, area: 'focus',
    title: SECRET, proofPhotoUri: `/private/${SECRET}.jpg`, rawPrompt: SECRET } as unknown as Quest;
  const summary = summarizeProgress([quest], new Date(NOW));
  expect(summary).toMatchObject({ questsDone: 1, xp: 10, topArea: 'focus' });
  expect(JSON.stringify(summary)).not.toContain(SECRET);
});

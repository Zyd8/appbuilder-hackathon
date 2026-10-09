import { QUEST_LIBRARY } from '../../data/quest-library';
import { questCandidates, validateQuestCandidate, validateQuestText, validateReroll } from '../quest-policy';
import type { Quest } from '../types';

const boundary = { date: '2026-10-10', maxRank: 'C' as const, energy: 'medium' as const, physicalCompletedToday: false };

test('filters rank, energy and physical candidates', () => {
  expect(questCandidates(boundary).some((item) => item.id === 'health-walk')).toBe(true);
  expect(questCandidates({ ...boundary, physicalCompletedToday: true }).some((item) => item.id === 'health-walk')).toBe(false);
  expect(questCandidates(boundary).some((item) => item.energy === 'high')).toBe(false);
  expect(() => validateQuestCandidate(QUEST_LIBRARY.find((item) => item.rank === 'B')!, boundary)).toThrow();
});
test('rejects unsafe or empty rewording and exhausted rerolls', () => {
  expect(() => validateQuestText('', 'hello')).toThrow();
  expect(() => validateQuestText('Test', 'Spend money now')).toThrow();
  expect(() => validateReroll({ status: 'active' } as Quest, 1, 1)).toThrow();
});

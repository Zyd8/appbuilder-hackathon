import { parseGeneratedDailyQuests } from '../quest-generation';

test('parses exactly three safe local-model goals', () => {
  const quests = parseGeneratedDailyQuests(JSON.stringify([
    { title: 'Drink water', instruction: 'Drink a glass of water before lunch.', area: 'health', estMinutes: 2, energy: 'low' },
    { title: 'Clear one surface', instruction: 'Tidy one small surface for five minutes.', area: 'organization', estMinutes: 5, energy: 'low' },
    { title: 'Write one idea', instruction: 'Write one idea for something you want to make.', area: 'creativity', estMinutes: 5, energy: 'low' },
  ]));
  expect(quests).toHaveLength(3);
  expect(quests[0].area).toBe('health');
});

test('accepts fenced JSON but rejects unsafe or malformed goals', () => {
  expect(parseGeneratedDailyQuests('```json\n[{"title":"One","instruction":"Do one safe thing","area":"focus","estMinutes":2,"energy":"low"},{"title":"Two","instruction":"Do one safe thing","area":"calm","estMinutes":2,"energy":"low"},{"title":"Three","instruction":"Do one safe thing","area":"health","estMinutes":2,"energy":"low"}]\n```')).toHaveLength(3);
  expect(() => parseGeneratedDailyQuests('[]')).toThrow();
  expect(() => parseGeneratedDailyQuests(JSON.stringify([
    { title: 'Spend money', instruction: 'Buy something now.', area: 'finance', estMinutes: 5, energy: 'low' },
    { title: 'Two', instruction: 'Safe.', area: 'calm', estMinutes: 2, energy: 'low' },
    { title: 'Three', instruction: 'Safe.', area: 'health', estMinutes: 2, energy: 'low' },
  ]))).toThrow();
});

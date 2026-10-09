import { usePreviewStore } from '../preview-store';

const mockProofSave = jest.fn(async () => 'opaque-proof-id-123456789');
const mockQuestGet = jest.fn();
const mockQuestList = jest.fn(async (): Promise<unknown[]> => []);
const mockCheckInGet = jest.fn(async () => null);
const mockHydrate = jest.fn();
const mockComplete = jest.fn();
const mockSaveCheckIn = jest.fn();
const mockReroll = jest.fn();
const mockUpsert = jest.fn();
const mockSyncProgress = jest.fn(async () => ({ totalXp: 0 }));

jest.mock('expo-sqlite/localStorage/install', () => ({}));
jest.mock('@/components/toast', () => ({ useToast: { getState: () => ({ show: jest.fn() }) } }));
jest.mock('@/lib/buddy-database', () => ({ openBuddyDatabase: async () => ({ closeAsync: async () => undefined }) }));
jest.mock('@/lib/quest-repository', () => ({ QuestRepository: class {
  get = (...args: unknown[]) => mockQuestGet(...(args as [])); list = (...args: unknown[]) => mockQuestList(...(args as []));
} }));
jest.mock('@/lib/check-in-repository', () => ({ CheckInRepository: class {
  get = (...args: unknown[]) => mockCheckInGet(...(args as []));
} }));
jest.mock('@/lib/progress-repository', () => ({ ProgressRepository: class {} }));
jest.mock('@/lib/quest-proof-store', () => ({ QuestPhotoProofStore: class {
  save = (...args: unknown[]) => mockProofSave(...(args as []));
} }));
jest.mock('@/features/buddy/adapters/phase2-actions', () => ({ Phase2Actions: class {
  hydrate = (...args: unknown[]) => mockHydrate(...(args as []));
  completeQuest = (...args: unknown[]) => mockComplete(...(args as []));
  saveCheckIn = (...args: unknown[]) => mockSaveCheckIn(...(args as []));
  rerollQuest = (...args: unknown[]) => mockReroll(...(args as []));
  upsertCuratedQuest = (...args: unknown[]) => mockUpsert(...(args as []));
} }));
jest.mock('@/lib/progress-sync', () => ({ syncProgress: (...args: unknown[]) => mockSyncProgress(...(args as [])) }));

const quest = { id: 'q1', templateId: 'focus-finish-small', source: 'library', kind: 'daily', area: 'focus',
  title: 'Loose Ends', flavor: '', instruction: 'Do it', rank: 'D', xp: 20, estMinutes: 15,
  status: 'active', offeredOn: '2026-10-10' };
const account = { id: 'person-1', email: null, displayName: 'Ari', avatarUrl: null, provider: 'google' };
const snapshot = { board: [], history: [{ quest: { ...quest, status: 'done' }, revision: 3 }],
  checkIn: null, progress: { doc: { totalXp: 20 }, level: 1, rank: 'E' }, earnedToday: 20, recoveryPendingQuestIds: [] };

beforeEach(() => {
  mockProofSave.mockClear(); mockQuestGet.mockReset(); mockQuestList.mockReset().mockResolvedValue([]);
  mockCheckInGet.mockReset().mockResolvedValue(null); mockHydrate.mockReset().mockResolvedValue(snapshot);
  mockComplete.mockReset().mockResolvedValue({ completion: { grantedXp: 20 }, progress: { level: 1 } });
  mockSaveCheckIn.mockReset().mockResolvedValue({ checkIn: { date: '2026-10-10', mood: 4, energy: 'low' }, revision: 1 });
  mockReroll.mockReset(); mockUpsert.mockReset(); mockSyncProgress.mockClear();
  usePreviewStore.setState({ account, profile: { ...usePreviewStore.getState().profile, totalXp: 0 },
    phase2Error: undefined, dailyQuests: [], weeklyQuest: undefined, sideQuests: [], history: [] });
});
test('private photo URI becomes an opaque proof ID before durable completion', async () => {
  mockQuestGet.mockResolvedValue({ quest, revision: 2 });
  const result = await usePreviewStore.getState().completeQuest('q1', 'file:///private/photo.jpg', 'Done');
  expect(mockProofSave).toHaveBeenCalledWith('q1', 'file:///private/photo.jpg');
  const call = mockComplete.mock.calls[0][0];
  expect(call).toMatchObject({ questId: 'q1', expectedRevision: 2, proofId: 'opaque-proof-id-123456789', reflection: 'Done' });
  expect(JSON.stringify(call)).not.toContain('file:///');
  expect(result.granted).toBe(20);
  expect(usePreviewStore.getState().history[0].status).toBe('done');
});
test('failed completion stays visible and never claims XP', async () => {
  mockQuestGet.mockResolvedValue({ quest, revision: 2 });
  mockComplete.mockRejectedValue(new Error('storage failed'));
  await expect(usePreviewStore.getState().completeQuest('q1', 'file:///private/photo.jpg')).rejects.toThrow();
  expect(usePreviewStore.getState().phase2Error).toContain('could not be completed');
  expect(usePreviewStore.getState().profile.totalXp).toBe(0);
});
test('check-in uses the durable revisioned command', async () => {
  await usePreviewStore.getState().saveCheckIn({ mood: 4, energy: 'low' });
  expect(mockSaveCheckIn).toHaveBeenCalledWith(expect.objectContaining({ mood: 4, energy: 'low' }), 0);
  expect(usePreviewStore.getState().checkIn?.mood).toBe(4);
});

test('first board is curated within the earned rank, without synthetic weekly wording', async () => {
  mockHydrate.mockResolvedValue({ ...snapshot, board: [], history: [] });
  await usePreviewStore.getState().hydratePhase2();
  expect(mockUpsert).toHaveBeenCalledTimes(6);
  const offered = mockUpsert.mock.calls.map(([item]) => item);
  expect(offered.every((item) => item.rank === 'E')).toBe(true);
  expect(offered.some((item) => item.kind === 'weekly')).toBe(true);
  expect(offered.some((item) => item.title === 'The Finished Thing')).toBe(false);
});

test('reroll goes through durable adapter and refreshes board', async () => {
  mockQuestGet.mockResolvedValue({ quest, revision: 2 });
  mockQuestList.mockResolvedValue([{ quest, revision: 2 }]);
  const newId = await usePreviewStore.getState().swapQuest('q1');
  expect(newId).toBeTruthy();
  expect(mockReroll).toHaveBeenCalledWith('q1', 2, expect.objectContaining({ id: newId, kind: 'daily' }),
    expect.objectContaining({ excludedTemplateIds: ['focus-finish-small'] }));
});

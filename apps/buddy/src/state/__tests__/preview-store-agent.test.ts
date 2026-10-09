import { usePreviewStore } from '../preview-store';

const mockStart = jest.fn();
const mockDecide = jest.fn();
jest.mock('expo-sqlite/localStorage/install', () => ({}));
jest.mock('@/lib/notes-sync', () => ({ scheduleNotesSync: jest.fn(), syncNotes: jest.fn() }));
jest.mock('@/components/toast', () => ({ useToast: { getState: () => ({ show: jest.fn() }) } }));
jest.mock('@/features/buddy/chat-service', () => ({
  getBuddyChatController: async () => ({ start: (...args: unknown[]) => mockStart(...args), decide: (...args: unknown[]) => mockDecide(...args),
    modelStatus: async () => 'ready', memory: { readAll: async () => [] } }),
  releaseBuddyChatController: async () => undefined,
  chatHistory: (messages: unknown[]) => messages,
}));

const account = { id: 'person-1', email: null, displayName: 'Ari', avatarUrl: null, provider: 'google' };
const confirmation = { callId: 'call-1', tool: 'notes.create', title: 'Save note', body: 'Buy milk', metadata: {},
  reason: 'Requested', privacyImpact: 'Local', storageImpact: 'One note' };
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  mockStart.mockReset(); mockDecide.mockReset();
  usePreviewStore.setState({ account, chat: [], pendingConfirmation: undefined, buddyTyping: false, chatError: undefined });
});
test('starts with no synthetic Buddy conversation or pending write', () => {
  expect(usePreviewStore.getState().chat).toEqual([]);
  expect(usePreviewStore.getState().pendingConfirmation).toBeUndefined();
});
test('holds a proposed note until confirmation, then shows clean response', async () => {
  mockStart.mockResolvedValue({ state: 'pending', confirmation, summary: ['notes.read: checked.'] });
  mockDecide.mockResolvedValue({ state: 'complete', summary: ['notes.create: succeeded.'], answer: 'Saved your note.' });
  usePreviewStore.getState().sendChat('Remember milk');
  await tick();
  expect(mockStart).toHaveBeenCalledTimes(1);
  expect(usePreviewStore.getState().pendingConfirmation?.callId).toBe('call-1');
  expect(usePreviewStore.getState().chat).toHaveLength(1);
  await usePreviewStore.getState().decideBuddyTool('confirm');
  expect(mockDecide).toHaveBeenCalledWith('call-1', 'confirm');
  expect(usePreviewStore.getState().pendingConfirmation).toBeUndefined();
  expect(usePreviewStore.getState().chat[1]).toMatchObject({ text: 'Saved your note.', contextUsed: ['notes.create: succeeded.'] });
});
test('rejecting clears pending state without a write claim', async () => {
  mockStart.mockResolvedValue({ state: 'pending', confirmation, summary: [] });
  mockDecide.mockResolvedValue({ state: 'stopped', summary: [], answer: 'You declined to save the note' });
  usePreviewStore.getState().sendChat('Remember milk');
  await tick();
  await usePreviewStore.getState().decideBuddyTool('reject');
  expect(usePreviewStore.getState().pendingConfirmation).toBeUndefined();
  expect(usePreviewStore.getState().chat[1].text).toContain('declined');
});

import { act, create } from 'react-test-renderer';
import type { ReactNode } from 'react';
import AskBuddy from '../(tabs)/buddy';

const mockState = {
  chat: [{ id: 'b1', role: 'buddy', text: 'Saved your note.', contextUsed: ['notes.read: checked.'], createdAt: '2026-10-10T10:00:00Z' }],
  buddyTyping: false, sendChat: jest.fn(), selectedModelId: 'gemma4-e2b', setModel: jest.fn(),
  pendingAttachments: [], addAttachments: jest.fn(), removeAttachment: jest.fn(), chatError: undefined,
  clearChatError: jest.fn(), pendingConfirmation: undefined, decideBuddyTool: jest.fn(),
  modelStatus: 'ready', refreshModelStatus: jest.fn(), installBuddyModel: jest.fn(),
  retryBuddyModel: jest.fn(), deleteBuddyModel: jest.fn(), memoryDocuments: [], memoryError: undefined,
  loadBuddyMemory: jest.fn(), saveBuddyMemory: jest.fn(), resetBuddyMemory: jest.fn(), deleteBuddyMemory: jest.fn(),
};
jest.mock('@/state/preview-store', () => ({ usePreviewStore: (selector: (value: typeof mockState) => unknown) => selector(mockState) }));
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => true }));
jest.mock('@/theme/use-theme', () => ({ useTheme: () => ({ colors: {
  text: 'navy', textMuted: 'blue', primary: 'blue', onPrimary: 'white', surface: 'white',
  surfaceAlt: 'pale', border: 'blue', background: 'white', danger: 'red',
} }) }));
jest.mock('@/components/screen', () => ({ Screen: 'Screen' }));
jest.mock('@/components/buddy-mascot', () => ({ BuddyMascot: 'BuddyMascot' }));
jest.mock('@/components/on-device-badge', () => ({ OnDeviceBadge: 'OnDeviceBadge' }));
jest.mock('@/components/chip', () => ({ Chip: 'Chip' }));
jest.mock('@/components/app-text', () => ({ AppText: 'AppText' }));
jest.mock('@/components/buddy-memory-sheet', () => ({ BuddyMemorySheet: 'BuddyMemorySheet' }));
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const React = jest.requireActual<typeof import('react')>('react');
  const FlatList = ({ data, renderItem, ListFooterComponent }: {
    data: typeof mockState.chat; renderItem: (arg: { item: typeof mockState.chat[number] }) => ReactNode; ListFooterComponent?: ReactNode;
  }) => React.createElement('FlatList', null, ...data.map((item) => renderItem({ item })), ListFooterComponent);
  return new Proxy(actual, { get(target, key) { return key === 'FlatList' ? FlatList : target[key]; } });
});
test('shows checked context and answer separately while model is ready', async () => {
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(<AskBuddy />); });
  const rendered = JSON.stringify(tree!.toJSON());
  expect(rendered).toContain('WHAT I CHECKED');
  expect(rendered).toContain('notes.read: checked.');
  expect(rendered).toContain('ANSWER');
  expect(rendered).toContain('Saved your note.');
  expect(rendered).toContain('Model ready on this device.');
  await act(async () => { tree!.unmount(); });
});

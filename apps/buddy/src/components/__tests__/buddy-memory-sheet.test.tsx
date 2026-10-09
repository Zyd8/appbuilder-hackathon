import { act, create } from 'react-test-renderer';
import { BuddyMemorySheet } from '../buddy-memory-sheet';
jest.mock('@/components/app-text', () => ({ AppText: 'AppText' }));
jest.mock('@/theme/use-theme', () => ({ useTheme: () => ({ colors: { text: 'navy', surface: 'white', border: 'blue' } }) }));
jest.mock('@/components/card', () => ({ Card: 'Card' }));
jest.mock('@/components/button', () => ({ Button: 'Button' }));
test('mounts management and labels memory local only', async () => {
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(<BuddyMemorySheet documents={[{ name: 'USER.md', text: '# USER.md', revision: 'r1', bytes: 9, managedEntries: 0 }]}
    onSave={async () => undefined} onReset={async () => undefined} onDelete={async () => undefined} />); });
  expect(JSON.stringify(tree!.toJSON())).toContain('Stored only on this device');
  expect(JSON.stringify(tree!.toJSON())).toContain('USER.md');
  await act(async () => { tree!.unmount(); });
});

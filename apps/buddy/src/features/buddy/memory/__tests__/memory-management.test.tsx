import { act, create } from 'react-test-renderer';

import { MemoryManagement, type MemoryManagementLabels } from '../memory-management';
import type { MemoryDocument } from '../memory-types';

jest.mock('@/theme/use-theme', () => ({ useTheme: () => ({ colors: { text: 'text', surface: 'surface', border: 'border' } }) }));
jest.mock('@/components/app-text', () => ({ AppText: 'AppText' }));
jest.mock('@/components/card', () => ({ Card: 'Card' }));
jest.mock('@/components/button', () => ({
  Button: ({ label, onPress, ...rest }: { label: string; onPress?: () => void }) =>
    jest.requireActual<typeof import('react')>('react').createElement('Button', { accessibilityLabel: label, onPress, ...rest }),
}));

const labels: MemoryManagementLabels = {
  title: 'Memory', localOnly: 'Only on this device', userDocument: 'USER.md', botDocument: 'BOT.md',
  usage: (used, max) => `${used}/${max}`, editHint: 'Edit memory', save: 'Save', reset: 'Reset',
  delete: 'Delete', confirmReset: 'Confirm reset', confirmDelete: 'Confirm delete', cancel: 'Cancel', error: 'Could not save',
};
const documents: MemoryDocument[] = [
  { name: 'USER.md', text: '# USER.md\n', revision: 'r1', bytes: 10, managedEntries: 0 },
  { name: 'BOT.md', text: '# BOT.md\n', revision: 'r2', bytes: 9, managedEntries: 0 },
];

it('shows local-only status and requires a second action before reset', async () => {
  const onReset = jest.fn(async () => undefined);
  let tree: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<MemoryManagement documents={documents} labels={labels}
      onSave={async () => undefined} onReset={onReset} onDelete={async () => undefined} />);
  });
  expect(tree!.root.findAllByProps({ children: labels.localOnly }).length).toBeGreaterThan(0);
  const reset = tree!.root.findByProps({ accessibilityLabel: labels.reset });
  await act(async () => { reset.props.onPress(); });
  expect(onReset).not.toHaveBeenCalled();
  const confirm = tree!.root.findByProps({ accessibilityLabel: labels.confirmReset });
  await act(async () => { confirm.props.onPress(); });
  expect(onReset).toHaveBeenCalledWith('USER.md', 'r1');
}, 15000);

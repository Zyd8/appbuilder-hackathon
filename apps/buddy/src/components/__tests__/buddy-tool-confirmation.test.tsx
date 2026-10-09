import { act, create } from 'react-test-renderer';
import { BuddyToolConfirmation } from '../buddy-tool-confirmation';
import type { ConfirmationDescriptor } from '@/features/buddy/contracts/tool-protocol';
jest.mock('@/theme/use-theme', () => ({ useTheme: () => ({ colors: { text: 'navy', textMuted: 'blue' } }) }));
jest.mock('@/components/button', () => ({ Button: ({ label, onPress }: { label: string; onPress: () => void }) =>
  jest.requireActual<typeof import('react')>('react').createElement('Button', { accessibilityLabel: label, onPress }) }));
const confirmation: ConfirmationDescriptor = { callId: 'c1', tool: 'notes.create', title: 'Create note', body: 'Buy milk', metadata: { date: 'Today' }, reason: 'You asked me to save this.', privacyImpact: 'Local only', storageImpact: 'One note will be saved.' };
test('shows exact write and requires the user to confirm or reject', async () => {
  const onDecide = jest.fn();
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(<BuddyToolConfirmation confirmation={confirmation} onDecide={onDecide} />); });
  const rendered = JSON.stringify(tree!.toJSON());
  expect(rendered).toContain('Buy milk');
  expect(rendered).toContain('Local only');
  expect(onDecide).not.toHaveBeenCalled();
  await act(async () => { tree!.root.findByProps({ accessibilityLabel: 'Reject' }).props.onPress(); });
  expect(onDecide).toHaveBeenCalledWith('reject');
  await act(async () => { tree!.unmount(); });
});

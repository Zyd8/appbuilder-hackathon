import { act, create } from 'react-test-renderer';
import { BuddyResponse } from '../buddy-response';
jest.mock('@/components/app-text', () => ({ AppText: 'AppText' }));
test('keeps observed summary separate from answer', async () => {
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(<BuddyResponse summary={['Read local notes']} answer="Ready." />); });
  const text = JSON.stringify(tree!.toJSON());
  expect(text).toContain('Read local notes');
  expect(text).toContain('Ready.');
  expect(text).toContain('WHAT I CHECKED');
  await act(async () => { tree!.unmount(); });
});

import { act, create } from 'react-test-renderer';
import { BuddyModelStatus } from '../buddy-model-status';
jest.mock('@/components/app-text', () => ({ AppText: 'AppText' }));
test('distinguishes ready and unavailable states', async () => {
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(<BuddyModelStatus status="not-installed" />); });
  expect(JSON.stringify(tree!.toJSON())).toContain('not installed');
  await act(async () => { tree!.update(<BuddyModelStatus status="ready" />); });
  expect(JSON.stringify(tree!.toJSON())).toContain('ready on this device');
  await act(async () => { tree!.unmount(); });
});

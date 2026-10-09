import { memoryPromptContext } from '../memory-index';
import type { MemoryDocument } from '../memory-types';

it('selects bounded managed memory only', () => {
  const docs: MemoryDocument[] = [{
    name: 'USER.md', text: '## Goals\n- Practice guitar\n## Hidden\n- Do not include this',
    bytes: 1, managedEntries: 1, revision: 'r1',
  }];
  expect(memoryPromptContext(docs, 100)).toContain('Practice guitar');
  expect(memoryPromptContext(docs, 100)).not.toContain('Do not include this');
  expect(memoryPromptContext(docs, 5)).toBe('');
});

import { MEMORY_DOCUMENT_MAX_BYTES, managedEntries, memoryBytes, modelAddressableMemory, validateMemory } from '../memory-policy';
import { MemoryValidationError } from '../memory-types';

describe('memory policy', () => {
  it('counts UTF-8 bytes and managed entries', () => {
    expect(memoryBytes('é')).toBe(2);
    expect(managedEntries('USER.md', '## Preferences\n- A\n- B\n## Other\n- hidden')).toBe(2);
    expect(() => validateMemory('USER.md', `## Preferences\n${'界'.repeat(MEMORY_DOCUMENT_MAX_BYTES)}`)).toThrow(MemoryValidationError);
    expect(() => validateMemory('USER.md', `## Goals\n${'- item\n'.repeat(65)}`)).toThrow(MemoryValidationError);
  });

  it('preserves unknown sections on disk but omits them from model context', () => {
    const text = validateMemory('USER.md', '# USER.md\r\n## Preferences\r\n- Quiet mornings\r\n## Private draft\r\n- do not expose');
    expect(text).toContain('## Private draft');
    expect(modelAddressableMemory('USER.md', text)).toBe('## Preferences\n- Quiet mornings');
  });

  it('blocks paths, data URLs, credentials and control characters', () => {
    for (const text of ['- file:///private/a', '- data:image/png;base64,AA', '- /data/user/0/a', '- api_key: 123', '- password=hello', '- sk-1234567890abcdef', '- hello\u0000']) {
      expect(() => validateMemory('USER.md', `## Preferences\n${text}`)).toThrow(MemoryValidationError);
    }
  });
});

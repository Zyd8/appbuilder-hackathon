import type { MemoryDocument } from './memory-types';
import { modelAddressableMemory, memoryBytes } from './memory-policy';

/** Bounded, deterministic selection. No chat mining or embeddings. */
export function memoryPromptContext(documents: readonly MemoryDocument[], maxBytes = 3072): string {
  const ordered = [...documents].sort((a, b) => a.name.localeCompare(b.name));
  const chunks: string[] = [];
  for (const document of ordered) {
    const remaining = maxBytes - memoryBytes(chunks.join('\n\n'));
    if (remaining <= 0) break;
    const content = modelAddressableMemory(document.name, document.text, Math.max(0, remaining - 16));
    if (content) chunks.push(`${document.name}:\n${content}`);
  }
  return chunks.join('\n\n');
}

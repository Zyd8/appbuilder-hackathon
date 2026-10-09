import type { ManagedSection, MemoryDocumentName } from './memory-types';
import { MemoryValidationError } from './memory-types';

export const MEMORY_DOCUMENT_MAX_BYTES = 16_384;
export const MEMORY_TOTAL_MAX_BYTES = 32_768;
export const MEMORY_MAX_ENTRIES = 64;

const MANAGED: Record<MemoryDocumentName, readonly ManagedSection[]> = {
  'USER.md': ['Preferences', 'Goals'],
  'BOT.md': ['About Buddy'],
};
const ENCODER = new TextEncoder();

export function memoryBytes(text: string): number { return ENCODER.encode(text).length; }

export function normalizeMemoryText(input: string): string {
  return input.normalize('NFC').replace(/\r\n?/g, '\n').trimEnd() + '\n';
}

function sectionMap(text: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current = '';
  sections.set(current, []);
  for (const line of text.split('\n')) {
    const heading = /^## ([^\n]+)$/.exec(line);
    if (heading) {
      current = heading[1].trim();
      if (!sections.has(current)) sections.set(current, []);
    } else {
      sections.get(current)!.push(line);
    }
  }
  return sections;
}

export function managedEntries(name: MemoryDocumentName, text: string): number {
  const sections = sectionMap(text);
  return MANAGED[name].reduce((sum, heading) =>
    sum + (sections.get(heading) ?? []).filter((line) => /^\s*[-*] /.test(line)).length, 0);
}

export function validateMemory(name: MemoryDocumentName, raw: string): string {
  const text = normalizeMemoryText(raw);
  if (memoryBytes(text) > MEMORY_DOCUMENT_MAX_BYTES) throw new MemoryValidationError('Memory document is too large.');
  if (managedEntries(name, text) > MEMORY_MAX_ENTRIES) throw new MemoryValidationError('Too many managed memory entries.');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new MemoryValidationError('Memory contains control characters.');
  // Memory is a compact preference store. Paths, data URLs, and credentials have no place in it.
  if (/(?:data:[^\s]+|file:\/\/[^\s]+|(?:^|\s)(?:\/data\/|\/storage\/|[A-Za-z]:\\)[^\s]*)/im.test(text))
    throw new MemoryValidationError('Memory cannot contain file paths or data URLs.');
  if (/(?:api[_ -]?key|secret|password)\s*[:=]|\bbearer\s+[A-Za-z0-9._-]{12,}|\bsk-[A-Za-z0-9]{12,}/i.test(text))
    throw new MemoryValidationError('Memory cannot contain credentials.');
  return text;
}

/** Unknown headings remain on disk but are never returned to the model. */
export function modelAddressableMemory(name: MemoryDocumentName, raw: string, maxBytes = 2048): string {
  const sections = sectionMap(raw);
  const result: string[] = [];
  for (const heading of MANAGED[name]) {
    const entries = (sections.get(heading) ?? [])
      .filter((line) => /^\s*[-*] /.test(line))
      .map((line) => line.trim())
      .filter((line, index, all) => all.findIndex((candidate) => candidate.toLocaleLowerCase() === line.toLocaleLowerCase()) === index);
    if (entries.length) result.push(`## ${heading}`, ...entries);
  }
  const lines: string[] = [];
  for (const line of result) {
    if (memoryBytes([...lines, line].join('\n')) > maxBytes) break;
    lines.push(line);
  }
  return lines.join('\n');
}

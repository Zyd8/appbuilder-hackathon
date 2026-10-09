import { Directory, File, Paths } from 'expo-file-system';

import { MEMORY_TEMPLATES } from './memory-templates';
import { managedEntries, memoryBytes, validateMemory } from './memory-policy';
import type { MemoryDocument, MemoryDocumentName, MemoryFileAdapter, MemoryNamespace } from './memory-types';
import { MemoryConflictError, MemoryValidationError } from './memory-types';

const NAMES: readonly MemoryDocumentName[] = ['USER.md', 'BOT.md'];

function namespacePath(namespace: MemoryNamespace): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(namespace.id)) throw new MemoryValidationError('Invalid memory namespace.');
  return `buddy-memory/${namespace.kind}/${namespace.id}`;
}

function revision(text: string): string {
  // Revision is a local change token, not a cryptographic identity or security boundary.
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return `${memoryBytes(text)}-${(hash >>> 0).toString(16)}`;
}

function document(name: MemoryDocumentName, text: string): MemoryDocument {
  return { name, text, revision: revision(text), bytes: memoryBytes(text), managedEntries: managedEntries(name, text) };
}

/** The only built-in adapter uses app-private document storage. No cloud or shared directory. */
export class ExpoMemoryFileAdapter implements MemoryFileAdapter {
  private parts(path: string): string[] {
    const parts = path.split('/');
    if (parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part) || part === '..' || part === '.'))
      throw new MemoryValidationError('Invalid memory file path.');
    return parts;
  }
  private file(path: string): File { return new File(Paths.document, ...this.parts(path)); }
  async ensureDirectory(path: string): Promise<void> {
    new Directory(Paths.document, ...this.parts(path)).create({ idempotent: true, intermediates: true });
  }
  async read(path: string): Promise<string | null> {
    const file = this.file(path);
    return file.exists ? file.text() : null;
  }
  async write(path: string, text: string): Promise<void> {
    const file = this.file(path);
    file.create({ overwrite: true });
    file.write(text);
  }
  async move(from: string, to: string): Promise<void> { await this.file(from).move(this.file(to)); }
  async remove(path: string): Promise<void> {
    const file = this.file(path);
    if (file.exists) file.delete();
  }
}

export class MemoryRepository {
  private readonly base: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly files: MemoryFileAdapter, namespace: MemoryNamespace) {
    this.base = namespacePath(namespace);
  }

  private path(name: MemoryDocumentName): string { return `${this.base}/${name}`; }

  private async current(name: MemoryDocumentName): Promise<MemoryDocument> {
    const path = this.path(name);
    const stored = await this.files.read(path);
    if (stored !== null) {
      try { return document(name, validateMemory(name, stored)); }
      catch {
        // Fall through to the last verified backup. Invalid current data is never model input.
      }
    }
    const backup = await this.files.read(`${path}.bak`);
    if (backup !== null) {
      const recovered = validateMemory(name, backup);
      await this.files.ensureDirectory(this.base);
      await this.files.write(path, recovered);
      return document(name, recovered);
    }
    if (stored !== null) throw new MemoryValidationError('Memory document is corrupt and no backup is available.');
    const template = validateMemory(name, MEMORY_TEMPLATES[name]);
    await this.files.ensureDirectory(this.base);
    await this.files.write(path, template);
    return document(name, template);
  }

  read(name: MemoryDocumentName): Promise<MemoryDocument> {
    return this.enqueue(() => this.current(name));
  }

  readAll(): Promise<readonly MemoryDocument[]> {
    return this.enqueue(async () => Promise.all(NAMES.map((name) => this.current(name))));
  }

  save(name: MemoryDocumentName, raw: string, expectedRevision: string): Promise<MemoryDocument> {
    return this.enqueue(async () => {
      const next = validateMemory(name, raw);
      const before = await this.current(name);
      if (before.revision !== expectedRevision) throw new MemoryConflictError();
      if (before.text === next) return before;
      const path = this.path(name);
      const temp = `${path}.tmp`;
      const backup = `${path}.bak`;
      await this.files.write(temp, next);
      if (await this.files.read(temp) !== next) throw new Error('Memory temp verification failed.');
      await this.files.remove(backup);
      await this.files.write(backup, before.text);
      if (await this.files.read(backup) !== before.text) throw new Error('Memory backup verification failed.');
      await this.files.remove(path);
      await this.files.move(temp, path);
      const stored = await this.files.read(path);
      if (stored !== next) throw new Error('Memory read-back failed.');
      await this.files.remove(backup);
      return document(name, next);
    });
  }

  reset(name: MemoryDocumentName, expectedRevision: string): Promise<MemoryDocument> {
    return this.save(name, MEMORY_TEMPLATES[name], expectedRevision);
  }

  delete(name: MemoryDocumentName, expectedRevision: string): Promise<void> {
    return this.enqueue(async () => {
      const current = await this.current(name);
      if (current.revision !== expectedRevision) throw new MemoryConflictError();
      const path = this.path(name);
      await this.files.remove(path);
      await this.files.remove(`${path}.bak`);
      await this.files.remove(`${path}.tmp`);
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}

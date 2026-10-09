export type MemoryDocumentName = 'USER.md' | 'BOT.md';
export type MemoryNamespace = { kind: 'guest'; id: string } | { kind: 'account'; id: string };
export type ManagedSection = 'Preferences' | 'Goals' | 'About Buddy';

export interface MemoryDocument {
  name: MemoryDocumentName;
  text: string;
  revision: string;
  bytes: number;
  managedEntries: number;
}

export interface MemoryFileAdapter {
  read(path: string): Promise<string | null>;
  write(path: string, text: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  ensureDirectory(path: string): Promise<void>;
}

export class MemoryConflictError extends Error { constructor() { super('Memory changed since it was opened.'); } }
export class MemoryValidationError extends Error {}

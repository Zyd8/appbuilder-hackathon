/**
 * On-device copy of the notes (localStorage backed by expo-sqlite), one document per user.
 * This copy is the source of truth; `public.notes` is a backup (ADR-008).
 */
import 'expo-sqlite/localStorage/install';

import { emptyNotesDoc, NOTES_SCHEMA_VERSION, sanitizeStoredNotes, type NotesDoc } from '@/domain/notes-sync';

const keyFor = (userId: string) => `buddy.notes.${userId}`;

export function loadNotes(userId: string): NotesDoc {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return emptyNotesDoc(userId);
    const parsed = JSON.parse(raw) as Partial<NotesDoc>;
    if (parsed.userId !== userId) return emptyNotesDoc(userId);
    return { schemaVersion: NOTES_SCHEMA_VERSION, userId, notes: sanitizeStoredNotes(parsed.notes) };
  } catch {
    return emptyNotesDoc(userId);
  }
}

export function writeNotes(doc: NotesDoc): void {
  localStorage.setItem(keyFor(doc.userId), JSON.stringify(doc));
}

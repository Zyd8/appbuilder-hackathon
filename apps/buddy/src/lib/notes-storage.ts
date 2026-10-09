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
    const agentRevision = Number.isSafeInteger(parsed.agentRevision) && (parsed.agentRevision ?? -1) >= 0
      ? parsed.agentRevision : 0;
    const rawReceipts = parsed.agentReceipts;
    const agentReceipts: NonNullable<NotesDoc['agentReceipts']> = {};
    if (rawReceipts && typeof rawReceipts === 'object' && !Array.isArray(rawReceipts)) {
      for (const [key, value] of Object.entries(rawReceipts)) {
        if (!/^[A-Za-z0-9_-]{16,128}$/.test(key) || !value || typeof value !== 'object') continue;
        const receipt = value as { fingerprint?: unknown; revision?: unknown; value?: unknown };
        if (typeof receipt.fingerprint === 'string' && typeof receipt.revision === 'string')
          agentReceipts[key] = { fingerprint: receipt.fingerprint, revision: receipt.revision, value: receipt.value };
      }
    }
    return { schemaVersion: NOTES_SCHEMA_VERSION, userId, notes: sanitizeStoredNotes(parsed.notes), agentRevision, agentReceipts };
  } catch {
    return emptyNotesDoc(userId);
  }
}

export function writeNotes(doc: NotesDoc): void {
  const current = loadNotes(doc.userId);
  localStorage.setItem(keyFor(doc.userId), JSON.stringify({
    ...doc,
    agentRevision: Math.max(current.agentRevision ?? 0, doc.agentRevision ?? 0) + 1,
    agentReceipts: doc.agentReceipts ?? current.agentReceipts ?? {},
  }));
}

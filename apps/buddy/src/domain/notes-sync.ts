/**
 * Notes saved on the device and backed up to `public.notes` (ADR-008). Pure rules only;
 * storage and Supabase live in `src/lib`. The device copy is the source of truth.
 */
import { isIsoDate } from './dates';
import { NOTE_MAX } from './notes';
import { LIFE_AREAS, NOTE_PRIORITIES, type LifeArea, type Note } from './types';

export const NOTES_SCHEMA_VERSION = 1;

export interface StoredNote extends Note {
  /** The `updatedAt` that last reached the cloud. Differs from `updatedAt` while a sync is pending. */
  syncedAt: string | null;
}

export interface NotesDoc {
  schemaVersion: number;
  userId: string;
  notes: StoredNote[];
  /** Local agent command receipts share this document's atomic device write. Never uploaded. */
  agentRevision?: number;
  agentReceipts?: Record<string, { fingerprint: string; revision: string; value: unknown }>;
}

export interface NoteRow {
  id: string;
  user_id: string;
  body: string;
  done: boolean;
  priority: Note['priority'];
  scheduled_on: string | null;
  area: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function emptyNotesDoc(userId: string): NotesDoc {
  return { schemaVersion: NOTES_SCHEMA_VERSION, userId, notes: [] };
}

export function isPending(note: StoredNote): boolean {
  return note.syncedAt !== note.updatedAt;
}

export function pendingCount(doc: NotesDoc | undefined): number {
  return doc ? doc.notes.filter(isPending).length : 0;
}

/** Same instant, one format: Postgres returns `+00:00` and microseconds, JS writes `.000Z`. */
function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : new Date(ms).toISOString();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isArea(value: unknown): value is LifeArea {
  return typeof value === 'string' && (LIFE_AREAS as readonly string[]).includes(value);
}

function isPriority(value: unknown): value is Note['priority'] {
  return typeof value === 'string' && (NOTE_PRIORITIES as readonly string[]).includes(value);
}

/** Validate one note from storage or the cloud. Untrusted input: returns undefined when invalid. */
export function sanitizeNote(raw: unknown): Note | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const createdAt = normalizeTimestamp(r.createdAt);
  const updatedAt = normalizeTimestamp(r.updatedAt);
  if (typeof r.id !== 'string' || !UUID.test(r.id) || !createdAt || !updatedAt) return undefined;
  if (typeof r.body !== 'string' || !r.body.trim() || r.body.length > NOTE_MAX) return undefined;
  const note: Note = {
    id: r.id.toLowerCase(),
    body: r.body,
    createdAt,
    updatedAt,
    done: r.done === true,
    priority: isPriority(r.priority) ? r.priority : 'normal',
  };
  if (isIsoDate(r.date)) note.date = r.date;
  if (isArea(r.area)) note.area = r.area;
  const deletedAt = normalizeTimestamp(r.deletedAt);
  if (deletedAt) note.deletedAt = deletedAt;
  return note;
}

/** Parse the stored note list; invalid entries and duplicate ids are dropped. */
export function sanitizeStoredNotes(raw: unknown): StoredNote[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: StoredNote[] = [];
  for (const entry of raw) {
    const note = sanitizeNote(entry);
    if (!note || seen.has(note.id)) continue;
    seen.add(note.id);
    const syncedAt = normalizeTimestamp((entry as Record<string, unknown>).syncedAt) ?? null;
    out.push({ ...note, syncedAt });
  }
  return out;
}

export function toNoteRow(note: Note, userId: string): NoteRow {
  return {
    id: note.id,
    user_id: userId,
    body: note.body,
    done: note.done,
    priority: note.priority,
    scheduled_on: note.date ?? null,
    area: note.area ?? null,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    deleted_at: note.deletedAt ?? null,
  };
}

/** A cloud row as a synced note, or undefined when the row is invalid. */
export function fromNoteRow(row: NoteRow): StoredNote | undefined {
  const note = sanitizeNote({
    id: row.id,
    body: row.body,
    done: row.done,
    priority: row.priority,
    date: row.scheduled_on ?? undefined,
    area: row.area ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  });
  return note ? { ...note, syncedAt: note.updatedAt } : undefined;
}

export interface MergeResult {
  notes: StoredNote[];
  /** Local edits that lost to a newer cloud edit and were kept as a separate note. */
  conflicts: number;
}

const newestFirst = (a: StoredNote, b: StoredNote) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

/**
 * Merge the cloud copy into the device copy. Per note, the newer `updatedAt` wins.
 * - A pending local edit that is newer stays and is pushed next.
 * - A pending local edit that loses to a newer cloud edit is never silently dropped:
 *   when its text differs, it is kept as a new note (a conflict copy).
 * - A synced local note missing from the cloud is marked pending so it is uploaded again.
 */
export function mergeRemoteNotes(
  local: readonly StoredNote[],
  remote: readonly StoredNote[],
  ports: { newId: () => string; now: string },
): MergeResult {
  const remoteById = new Map(remote.map((note) => [note.id, note]));
  const localIds = new Set(local.map((note) => note.id));
  const out: StoredNote[] = [];
  let conflicts = 0;

  for (const mine of local) {
    const theirs = remoteById.get(mine.id);
    if (!theirs) {
      out.push(isPending(mine) ? mine : { ...mine, syncedAt: null });
      continue;
    }
    const mineAt = Date.parse(mine.updatedAt);
    const theirsAt = Date.parse(theirs.updatedAt);
    if (mineAt > theirsAt) {
      // Ours is newer (pending, or the cloud lost it): push it.
      out.push(isPending(mine) ? mine : { ...mine, syncedAt: null });
      continue;
    }
    if (mineAt === theirsAt) {
      // Same version: the cloud has it.
      out.push({ ...mine, syncedAt: mine.updatedAt });
      continue;
    }
    // The cloud copy is newer.
    if (isPending(mine) && !mine.deletedAt && mine.body !== theirs.body) {
      conflicts += 1;
      out.push({ ...mine, id: ports.newId(), createdAt: ports.now, updatedAt: ports.now, syncedAt: null });
    }
    if (!theirs.deletedAt) out.push(theirs);
  }

  for (const theirs of remote) {
    if (!localIds.has(theirs.id) && !theirs.deletedAt) out.push(theirs);
  }

  return { notes: out.sort(newestFirst), conflicts };
}

/** Drop deletions the cloud already has; they no longer need to be kept on the device. */
export function purgeSyncedDeletes(notes: readonly StoredNote[]): StoredNote[] {
  return notes.filter((note) => !(note.deletedAt && !isPending(note)));
}

export interface NotesSyncPorts {
  /** Every cloud row for this user, including deleted ones. Throws when offline. */
  pullRemote: () => Promise<StoredNote[]>;
  /** Idempotent upsert by id. Throws on failure. */
  upsertRemote: (rows: NoteRow[]) => Promise<void>;
  /** The newest device copy; edits may land while a request is in flight. */
  readLatest: () => NotesDoc;
  writeLocal: (doc: NotesDoc) => void;
  newId: () => string;
  now: () => string;
}

export interface NotesSyncResult {
  doc: NotesDoc;
  /** True when every pending change reached the cloud. */
  ok: boolean;
  conflicts: number;
}

/**
 * One sync cycle: pull, merge into the device copy, push pending notes, then mark only the
 * pushed versions as synced, so edits made during the push stay pending. Never throws.
 */
export async function syncNotesLocalFirst(ports: NotesSyncPorts): Promise<NotesSyncResult> {
  let remote: StoredNote[];
  try {
    remote = await ports.pullRemote();
  } catch {
    return { doc: ports.readLatest(), ok: false, conflicts: 0 };
  }

  const before = ports.readLatest();
  const { notes, conflicts } = mergeRemoteNotes(before.notes, remote, { newId: ports.newId, now: ports.now() });
  const merged: NotesDoc = { ...before, notes };
  ports.writeLocal(merged);

  const pending = merged.notes.filter(isPending);
  if (pending.length > 0) {
    try {
      await ports.upsertRemote(pending.map((note) => toNoteRow(note, merged.userId)));
    } catch {
      return { doc: ports.readLatest(), ok: false, conflicts };
    }
  }

  const pushed = new Map(pending.map((note) => [note.id, note.updatedAt]));
  const latest = ports.readLatest();
  const synced = latest.notes.map((note) =>
    pushed.get(note.id) === note.updatedAt ? { ...note, syncedAt: note.updatedAt } : note,
  );
  const doc: NotesDoc = { ...latest, notes: purgeSyncedDeletes(synced) };
  ports.writeLocal(doc);
  return { doc, ok: !doc.notes.some(isPending), conflicts };
}

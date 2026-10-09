/// <reference types="jest" />
import {
  emptyNotesDoc,
  fromNoteRow,
  isPending,
  mergeRemoteNotes,
  pendingCount,
  purgeSyncedDeletes,
  sanitizeStoredNotes,
  syncNotesLocalFirst,
  toNoteRow,
  type NoteRow,
  type NotesDoc,
  type NotesSyncPorts,
  type StoredNote,
} from '../notes-sync';

const USER = 'user-1';
const T0 = '2026-10-09T08:00:00.000Z';
const T1 = '2026-10-09T09:00:00.000Z';
const T2 = '2026-10-09T10:00:00.000Z';
const NOW = '2026-10-09T12:00:00.000Z';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** A note already in the cloud at `updatedAt`. */
function synced(n: number, overrides: Partial<StoredNote> = {}): StoredNote {
  const updatedAt = overrides.updatedAt ?? T0;
  return {
    id: id(n),
    body: `note ${n}`,
    createdAt: T0,
    updatedAt,
    done: false,
    priority: 'normal',
    syncedAt: updatedAt,
    ...overrides,
  };
}

/** A note with a local change that has not reached the cloud. */
function pending(n: number, overrides: Partial<StoredNote> = {}): StoredNote {
  return { ...synced(n, overrides), syncedAt: overrides.syncedAt ?? null };
}

let nextId = 900;
const ports = { newId: () => id(nextId++), now: NOW };

describe('mergeRemoteNotes', () => {
  it('adds cloud notes missing on this device, but not cloud deletions', () => {
    const { notes } = mergeRemoteNotes([], [synced(1), synced(2, { deletedAt: T1, updatedAt: T1 })], ports);
    expect(notes.map((n) => n.id)).toEqual([id(1)]);
    expect(isPending(notes[0])).toBe(false);
  });

  it('takes a newer cloud copy when the local one is synced', () => {
    const { notes } = mergeRemoteNotes([synced(1)], [synced(1, { body: 'edited elsewhere', updatedAt: T1 })], ports);
    expect(notes).toEqual([synced(1, { body: 'edited elsewhere', updatedAt: T1 })]);
  });

  it('drops a synced local note that was deleted on another device', () => {
    const { notes } = mergeRemoteNotes([synced(1)], [synced(1, { deletedAt: T1, updatedAt: T1 })], ports);
    expect(notes).toEqual([]);
  });

  it('keeps a newer pending local edit so it is pushed next', () => {
    const local = pending(1, { body: 'mine', updatedAt: T2 });
    const { notes, conflicts } = mergeRemoteNotes([local], [synced(1, { body: 'theirs', updatedAt: T1 })], ports);
    expect(notes).toEqual([local]);
    expect(conflicts).toBe(0);
  });

  it('keeps a losing pending text edit as a conflict copy instead of dropping it', () => {
    const local = pending(1, { body: 'my words', updatedAt: T1 });
    const remote = synced(1, { body: 'their words', updatedAt: T2 });
    const { notes, conflicts } = mergeRemoteNotes([local], [remote], ports);
    expect(conflicts).toBe(1);
    expect(notes).toHaveLength(2);
    expect(notes).toContainEqual(remote);
    const copy = notes.find((n) => n.id !== id(1));
    expect(copy).toMatchObject({ body: 'my words', updatedAt: NOW, createdAt: NOW, syncedAt: null });
  });

  it('keeps a losing text edit even when the other device deleted the note', () => {
    const local = pending(1, { body: 'my words', updatedAt: T1 });
    const { notes, conflicts } = mergeRemoteNotes([local], [synced(1, { deletedAt: T2, updatedAt: T2 })], ports);
    expect(conflicts).toBe(1);
    expect(notes.map((n) => n.body)).toEqual(['my words']);
    expect(notes[0].id).not.toBe(id(1));
  });

  it('lets a newer cloud edit win without a copy when the text is the same', () => {
    const local = pending(1, { done: true, updatedAt: T1 });
    const remote = synced(1, { date: '2026-10-12', updatedAt: T2 });
    const { notes, conflicts } = mergeRemoteNotes([local], [remote], ports);
    expect(conflicts).toBe(0);
    expect(notes).toEqual([remote]);
  });

  it('marks a version the cloud already has as synced', () => {
    const local = pending(1, { updatedAt: T1, syncedAt: T0 });
    const { notes } = mergeRemoteNotes([local], [synced(1, { updatedAt: T1 })], ports);
    expect(isPending(notes[0])).toBe(false);
  });

  it('re-uploads a synced note the cloud no longer has', () => {
    const { notes } = mergeRemoteNotes([synced(1)], [], ports);
    expect(isPending(notes[0])).toBe(true);
  });

  it('orders the result newest first', () => {
    const older = synced(1, { createdAt: T0 });
    const newer = synced(2, { createdAt: T2, updatedAt: T2 });
    expect(mergeRemoteNotes([older], [newer], ports).notes.map((n) => n.id)).toEqual([id(2), id(1)]);
  });
});

describe('purgeSyncedDeletes', () => {
  it('drops deletions the cloud has and keeps pending ones', () => {
    const notes = [synced(1, { deletedAt: T0 }), pending(2, { deletedAt: T1, updatedAt: T1 }), synced(3)];
    expect(purgeSyncedDeletes(notes).map((n) => n.id)).toEqual([id(2), id(3)]);
  });
});

describe('cloud rows', () => {
  it('round-trips a note and normalizes Postgres timestamps', () => {
    const note = synced(1, { date: '2026-10-12', area: 'calm', priority: 'high', done: true });
    const row = toNoteRow(note, USER);
    expect(row).toMatchObject({ user_id: USER, scheduled_on: '2026-10-12', area: 'calm', deleted_at: null });
    const fromPostgres: NoteRow = { ...row, created_at: '2026-10-09 08:00:00+00', updated_at: '2026-10-09T08:00:00.000000+00:00' };
    expect(fromNoteRow(fromPostgres)).toEqual(note);
  });

  it('round-trips the manual order, and leaves never-moved notes unset (ADR-011)', () => {
    const moved = synced(1, { position: -1.5e12 });
    expect(toNoteRow(moved, USER).position).toBe(-1.5e12);
    expect(fromNoteRow(toNoteRow(moved, USER))).toEqual(moved);
    expect(toNoteRow(synced(2), USER).position).toBeNull();
    expect(fromNoteRow(toNoteRow(synced(2), USER))?.position).toBeUndefined();
    expect(sanitizeStoredNotes([{ ...synced(3), position: 'top' }])[0].position).toBeUndefined();
  });

  it('rejects invalid rows from untrusted input', () => {
    const row = toNoteRow(synced(1), USER);
    expect(fromNoteRow({ ...row, body: '' })).toBeUndefined();
    expect(fromNoteRow({ ...row, id: 'not-a-uuid' })).toBeUndefined();
    expect(fromNoteRow({ ...row, updated_at: 'yesterday' })).toBeUndefined();
    expect(fromNoteRow({ ...row, scheduled_on: '2026-02-30', area: 'chaos' })).toEqual(synced(1));
  });

  it('sanitizes the stored list: drops junk and duplicate ids', () => {
    const stored = sanitizeStoredNotes([synced(1), { id: id(2) }, synced(1, { body: 'dupe' }), 'junk', pending(3)]);
    expect(stored.map((n) => n.id)).toEqual([id(1), id(3)]);
    expect(stored[1].syncedAt).toBeNull();
    expect(sanitizeStoredNotes({ not: 'a list' })).toEqual([]);
  });
});

/** In-memory device storage plus a fake cloud table keyed by id. */
function harness(initial: StoredNote[], cloud: StoredNote[] = []) {
  let local: NotesDoc = { ...emptyNotesDoc(USER), notes: initial };
  const table = new Map<string, NoteRow>(cloud.map((n) => [n.id, toNoteRow(n, USER)]));
  const upserts: NoteRow[][] = [];
  const syncPorts: NotesSyncPorts = {
    pullRemote: async () => [...table.values()].map((row) => fromNoteRow(row)!),
    upsertRemote: async (rows) => {
      upserts.push(rows);
      for (const row of rows) {
        const existing = table.get(row.id);
        // Mirrors the `notes_keep_newest` trigger: older pushes are skipped.
        if (!existing || Date.parse(row.updated_at) >= Date.parse(existing.updated_at)) table.set(row.id, row);
      }
    },
    readLatest: () => local,
    writeLocal: (doc) => {
      local = doc;
    },
    newId: () => id(nextId++),
    now: () => NOW,
  };
  return {
    ports: syncPorts,
    table,
    upserts,
    get local() {
      return local;
    },
    edit(change: (doc: NotesDoc) => NotesDoc) {
      local = change(local);
    },
  };
}

describe('syncNotesLocalFirst', () => {
  it('pushes pending notes and marks them synced', async () => {
    const h = harness([pending(1)]);
    const result = await syncNotesLocalFirst(h.ports);
    expect(result.ok).toBe(true);
    expect(h.table.get(id(1))?.body).toBe('note 1');
    expect(pendingCount(h.local)).toBe(0);
  });

  it('keeps everything pending when offline (pull fails)', async () => {
    const h = harness([pending(1)]);
    h.ports.pullRemote = async () => {
      throw new Error('offline');
    };
    const result = await syncNotesLocalFirst(h.ports);
    expect(result.ok).toBe(false);
    expect(pendingCount(h.local)).toBe(1);
  });

  it('keeps notes pending when the upload fails, but still saves merged cloud notes', async () => {
    const h = harness([pending(1)], [synced(2)]);
    h.ports.upsertRemote = async () => {
      throw new Error('500');
    };
    const result = await syncNotesLocalFirst(h.ports);
    expect(result.ok).toBe(false);
    expect(h.local.notes.map((n) => n.id).sort()).toEqual([id(1), id(2)]);
    expect(pendingCount(h.local)).toBe(1);
  });

  it('leaves an edit made during the upload pending', async () => {
    const h = harness([pending(1, { body: 'first' })]);
    const upload = h.ports.upsertRemote;
    h.ports.upsertRemote = async (rows) => {
      await upload(rows);
      h.edit((doc) => ({
        ...doc,
        notes: doc.notes.map((n) => ({ ...n, body: 'second', updatedAt: T2 })),
      }));
    };
    await syncNotesLocalFirst(h.ports);
    expect(h.local.notes[0]).toMatchObject({ body: 'second', updatedAt: T2, syncedAt: null });
    expect(h.table.get(id(1))?.body).toBe('first');
  });

  it('is idempotent: syncing twice leaves one row and nothing to upload', async () => {
    const h = harness([pending(1)]);
    await syncNotesLocalFirst(h.ports);
    await syncNotesLocalFirst(h.ports);
    expect(h.table.size).toBe(1);
    expect(h.upserts).toHaveLength(1);
  });

  it('uploads a deletion as a tombstone, then forgets it on the device', async () => {
    const h = harness([pending(1, { deletedAt: T1, updatedAt: T1, syncedAt: T0 })], [synced(1)]);
    await syncNotesLocalFirst(h.ports);
    expect(h.table.get(id(1))?.deleted_at).toBe(T1);
    expect(h.local.notes).toEqual([]);
  });

  it('restores notes on a fresh install', async () => {
    const h = harness([], [synced(1), synced(2, { deletedAt: T1, updatedAt: T1 })]);
    const result = await syncNotesLocalFirst(h.ports);
    expect(result.doc.notes.map((n) => n.id)).toEqual([id(1)]);
    expect(h.upserts).toHaveLength(0);
  });

  it('reports conflicts and uploads the conflict copy', async () => {
    const h = harness([pending(1, { body: 'mine', updatedAt: T1 })], [synced(1, { body: 'theirs', updatedAt: T2 })]);
    const result = await syncNotesLocalFirst(h.ports);
    expect(result.conflicts).toBe(1);
    expect([...h.table.values()].map((r) => r.body).sort()).toEqual(['mine', 'theirs']);
    expect(pendingCount(h.local)).toBe(0);
  });
});

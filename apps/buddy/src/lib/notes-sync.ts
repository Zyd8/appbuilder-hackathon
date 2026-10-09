/**
 * Supabase backup of the notes (`public.notes`, ADR-008).
 * Cycles are queued so only one runs at a time; edits schedule a debounced cycle.
 */
import { randomUUID } from 'expo-crypto';

import {
  fromNoteRow,
  syncNotesLocalFirst,
  type NoteRow,
  type NotesDoc,
  type NotesSyncResult,
  type StoredNote,
} from '@/domain/notes-sync';

import { loadNotes, writeNotes } from './notes-storage';
import { getSupabase } from './supabase';

const TABLE = 'notes';
const COLUMNS = 'id, user_id, body, done, priority, scheduled_on, area, created_at, updated_at, deleted_at';
const BATCH = 100;
const DEBOUNCE_MS = 1500;

async function pullNotes(userId: string): Promise<StoredNote[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS).eq('user_id', userId)
    .overrideTypes<NoteRow[], { merge: false }>();
  if (error) throw error;
  return (data ?? []).map(fromNoteRow).filter((note): note is StoredNote => Boolean(note));
}

async function pushNotes(rows: NoteRow[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from(TABLE).upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
    if (error) throw error;
  }
}

/** Is there a signed-in session for this user? Without one, notes stay on the device only. */
async function hasSession(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id === userId;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Run one sync cycle for this user. `onLocalChange` sees every device write (merged cloud notes,
 * synced marks) so the UI stays current. Safe to call often; never throws.
 */
export function syncNotes(userId: string, onLocalChange: (doc: NotesDoc) => void): Promise<NotesSyncResult> {
  const run = queue.then(async (): Promise<NotesSyncResult> => {
    if (!(await hasSession(userId))) return { doc: loadNotes(userId), ok: false, conflicts: 0 };
    return syncNotesLocalFirst({
      pullRemote: () => pullNotes(userId),
      upsertRemote: pushNotes,
      readLatest: () => loadNotes(userId),
      writeLocal: (doc) => {
        writeNotes(doc);
        onLocalChange(doc);
      },
      newId: randomUUID,
      now: () => new Date().toISOString(),
    });
  });
  const safe = run.catch((): NotesSyncResult => ({ doc: loadNotes(userId), ok: false, conflicts: 0 }));
  queue = safe;
  return safe;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Sync shortly after the last edit, so a burst of edits becomes one upload. */
export function scheduleNotesSync(run: () => void): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    run();
  }, DEBOUNCE_MS);
}

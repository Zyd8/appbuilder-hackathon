/** Pure note rules. Notes replaced tasks (ADR-007); any note can be checked off and scheduled for a day (ADR-008). */
import type { Note } from './types';

export const NOTE_MAX = 2000;

/** Notes that are not deleted. */
export function visibleNotes<T extends Note>(notes: readonly T[]): T[] {
  return notes.filter((note) => !note.deletedAt);
}

/** Notes for the Today tab: scheduled for today, or with no date. */
export function notesForToday(notes: readonly Note[], today: string): Note[] {
  return notes.filter((note) => !note.deletedAt && (!note.date || note.date === today));
}

/** Notes scheduled for one day. Undated notes never show in the calendar. */
export function notesOnDate(notes: readonly Note[], date: string): Note[] {
  return notes.filter((note) => !note.deletedAt && note.date === date);
}

/** Days that have at least one note, for the calendar dots. */
export function datesWithNotes(notes: readonly Note[]): Set<string> {
  const dates = new Set<string>();
  for (const note of notes) if (!note.deletedAt && note.date) dates.add(note.date);
  return dates;
}

const PRIORITY_RANK: Record<Note['priority'], number> = { high: 0, normal: 1, low: 2 };

/** Where a note sits in the manual order (ADR-011). Notes never moved keep newest-first order. */
export function notePosition(note: Note): number {
  return note.position ?? -Date.parse(note.createdAt);
}

/** Open notes first (high priority on top), finished notes last; the manual order within each group. */
export function sortNotes(notes: readonly Note[]): Note[] {
  return notes
    .map((note, index) => ({ note, index }))
    .sort(
      (a, b) =>
        Number(a.note.done) - Number(b.note.done) ||
        PRIORITY_RANK[a.note.priority] - PRIORITY_RANK[b.note.priority] ||
        notePosition(a.note) - notePosition(b.note) ||
        a.index - b.index,
    )
    .map(({ note }) => note);
}

/** Gap left when a note moves past either end of the list (the same as one second, in default positions). */
const POSITION_STEP = 1000;

/** A position that sorts above every given note, so a new note lands on top. */
export function topPosition(notes: readonly Note[], now: string): number {
  const newest = -Date.parse(now);
  return notes.reduce((min, note) => Math.min(min, notePosition(note) - POSITION_STEP), newest);
}

/**
 * Move `noteId` so it sits where it is in `orderedIds` (the list as the user arranged it).
 * Only the moved note changes: it takes a position between its new neighbours, so a reorder
 * never rewrites (and never clobbers a concurrent edit to) any other note. When the neighbours
 * are too close to fit a value between them, the listed notes are renumbered instead.
 */
export function moveNote<T extends Note>(notes: readonly T[], noteId: string, orderedIds: readonly string[], now: string): T[] {
  const index = orderedIds.indexOf(noteId);
  const byId = new Map(notes.map((note) => [note.id, note]));
  if (index < 0 || !byId.has(noteId)) return [...notes];
  const before = byId.get(orderedIds[index - 1]);
  const after = byId.get(orderedIds[index + 1]);

  let position: number;
  if (before && after) position = (notePosition(before) + notePosition(after)) / 2;
  else if (before) position = notePosition(before) + POSITION_STEP;
  else if (after) position = notePosition(after) - POSITION_STEP;
  else return [...notes];

  const fits = (!before || position > notePosition(before)) && (!after || position < notePosition(after));
  if (fits) {
    return notes.map((note) => (note.id === noteId ? { ...note, position, updatedAt: now } : note));
  }

  // Rare: renumber the listed notes evenly, keeping them where the first one was.
  const listed = orderedIds.map((id) => byId.get(id)).filter((note): note is T => Boolean(note));
  const start = Math.min(...listed.map(notePosition));
  const renumbered = new Map(listed.map((note, i) => [note.id, start + i * POSITION_STEP]));
  return notes.map((note) =>
    renumbered.has(note.id) ? { ...note, position: renumbered.get(note.id), updatedAt: now } : note,
  );
}

/** Trimmed, length-limited body (line breaks kept), or undefined when there is nothing to save. */
export function cleanNoteBody(raw: string): string | undefined {
  const body = raw.replace(/\r\n?/g, '\n').trim().slice(0, NOTE_MAX);
  return body ? body : undefined;
}

/** A new open note. Returns undefined for blank input. */
export function createNote(id: string, rawBody: string, now: string, date?: string): Note | undefined {
  const body = cleanNoteBody(rawBody);
  if (!body) return undefined;
  return { id, body, createdAt: now, updatedAt: now, done: false, priority: 'normal', date };
}

/** Change the text and/or date. `date: undefined` clears it. Blank text keeps the old body. */
export function editNote<T extends Note>(note: T, changes: { body?: string; date?: string }, now: string): T {
  const body = changes.body === undefined ? note.body : (cleanNoteBody(changes.body) ?? note.body);
  const date = 'date' in changes ? changes.date : note.date;
  if (body === note.body && date === note.date) return note;
  return { ...note, body, date, updatedAt: now };
}

export function toggleDone<T extends Note>(note: T, now: string): T {
  return { ...note, done: !note.done, updatedAt: now };
}

export function softDelete<T extends Note>(note: T, now: string): T {
  return note.deletedAt ? note : { ...note, deletedAt: now, updatedAt: now };
}

/** Exact desired-state completion; repeated requests never toggle a note back. */
export function setNoteDone<T extends Note>(note: T, desiredDone: boolean, now: string): T {
  return note.done === desiredDone ? note : { ...note, done: desiredDone, updatedAt: now };
}

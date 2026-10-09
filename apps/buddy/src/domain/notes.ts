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

/** Open notes first (high priority on top), finished notes last. Stable within each group. */
export function sortNotes(notes: readonly Note[]): Note[] {
  return notes
    .map((note, index) => ({ note, index }))
    .sort(
      (a, b) =>
        Number(a.note.done) - Number(b.note.done) ||
        PRIORITY_RANK[a.note.priority] - PRIORITY_RANK[b.note.priority] ||
        a.index - b.index,
    )
    .map(({ note }) => note);
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

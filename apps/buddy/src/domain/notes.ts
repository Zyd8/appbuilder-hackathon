/** Pure note rules. Notes replaced tasks (ADR-007): any note can be checked off. */
import type { Note } from './types';

export const NOTE_MAX = 2000;

/** Notes for the Today tab: due today, or with no due date. */
export function notesForToday(notes: readonly Note[], today: string): Note[] {
  return notes.filter((note) => !note.due || note.due === today);
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

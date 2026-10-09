/// <reference types="jest" />
import {
  cleanNoteBody,
  createNote,
  datesWithNotes,
  editNote,
  moveNote,
  NOTE_MAX,
  notePosition,
  notesForToday,
  notesOnDate,
  softDelete,
  sortNotes,
  toggleDone,
  topPosition,
  visibleNotes,
} from '../notes';
import type { Note } from '../types';

const T0 = '2026-10-09T08:00:00.000Z';
const T1 = '2026-10-09T09:00:00.000Z';

function note(id: string, overrides: Partial<Note> = {}): Note {
  return { id, body: id, createdAt: T0, updatedAt: T0, priority: 'normal', done: false, ...overrides };
}

describe('notesForToday', () => {
  it('keeps notes scheduled for today and undated notes, never deleted ones', () => {
    const notes = [
      note('a', { date: '2026-10-09' }),
      note('b', { date: '2026-10-10' }),
      note('c'),
      note('gone', { deletedAt: T1 }),
    ];
    expect(notesForToday(notes, '2026-10-09').map((n) => n.id)).toEqual(['a', 'c']);
  });
});

describe('notesOnDate', () => {
  it('keeps only notes scheduled for that day (undated notes never show in the calendar)', () => {
    const notes = [
      note('a', { date: '2026-10-12' }),
      note('b'),
      note('c', { date: '2026-10-13' }),
      note('d', { date: '2026-10-12', deletedAt: T1 }),
    ];
    expect(notesOnDate(notes, '2026-10-12').map((n) => n.id)).toEqual(['a']);
  });
});

describe('datesWithNotes', () => {
  it('collects the dates of visible dated notes', () => {
    const notes = [note('a', { date: '2026-10-12' }), note('b'), note('c', { date: '2026-10-20', deletedAt: T1 })];
    expect([...datesWithNotes(notes)]).toEqual(['2026-10-12']);
  });
});

describe('visibleNotes', () => {
  it('hides deleted notes', () => {
    expect(visibleNotes([note('a'), note('b', { deletedAt: T1 })]).map((n) => n.id)).toEqual(['a']);
  });
});

describe('sortNotes', () => {
  it('puts open high-priority notes first and done notes last, keeping order otherwise', () => {
    const notes = [note('done', { done: true }), note('n1'), note('high', { priority: 'high' }), note('n2'), note('low', { priority: 'low' })];
    expect(sortNotes(notes).map((n) => n.id)).toEqual(['high', 'n1', 'n2', 'low', 'done']);
  });

  it('orders never-moved notes newest first, and moved notes by their position', () => {
    const older = note('older', { createdAt: T0 });
    const newer = note('newer', { createdAt: T1 });
    expect(sortNotes([older, newer]).map((n) => n.id)).toEqual(['newer', 'older']);
    const movedUp = { ...older, position: notePosition(newer) - 1 };
    expect(sortNotes([newer, movedUp]).map((n) => n.id)).toEqual(['older', 'newer']);
  });
});

describe('moveNote', () => {
  const T2 = '2026-10-09T10:00:00.000Z';
  const NOW = '2026-10-10T12:00:00.000Z';
  // Shown newest first: c, b, a.
  const notes = [note('a', { createdAt: T0 }), note('b', { createdAt: T1 }), note('c', { createdAt: T2 })];
  const ordered = (list: Note[]) => sortNotes(list).map((n) => n.id);

  it('moves a note between its new neighbours and changes only that note', () => {
    const moved = moveNote(notes, 'a', ['c', 'a', 'b'], NOW);
    expect(ordered(moved)).toEqual(['c', 'a', 'b']);
    expect(moved.filter((n) => n.updatedAt === NOW).map((n) => n.id)).toEqual(['a']);
  });

  it('moves a note to the top and to the bottom', () => {
    expect(ordered(moveNote(notes, 'a', ['a', 'c', 'b'], NOW))).toEqual(['a', 'c', 'b']);
    expect(ordered(moveNote(notes, 'c', ['b', 'a', 'c'], NOW))).toEqual(['b', 'a', 'c']);
  });

  it('keeps working after many moves into the same gap', () => {
    let list = notes;
    for (let i = 0; i < 80; i++) {
      // Alternate which note squeezes in next to c, halving the same gap every time.
      const id = i % 2 ? 'a' : 'b';
      const other = id === 'a' ? 'b' : 'a';
      list = moveNote(list, id, ['c', id, other], NOW);
      expect(ordered(list)).toEqual(['c', id, other]);
    }
  });

  it('ignores ids that are not listed or not known', () => {
    expect(moveNote(notes, 'zzz', ['zzz', 'a'], NOW)).toEqual(notes);
    expect(moveNote(notes, 'a', ['b', 'c'], NOW)).toEqual(notes);
  });

  it('puts a new note above notes that were dragged to the top', () => {
    const dragged = moveNote(notes, 'a', ['a', 'c', 'b'], NOW);
    const fresh = note('fresh', { createdAt: NOW, position: topPosition(dragged, NOW) });
    expect(ordered([...dragged, fresh])[0]).toBe('fresh');
  });
});

describe('cleanNoteBody', () => {
  it('trims but keeps line breaks', () => {
    expect(cleanNoteBody('  ideas:\r\n- bold colors \n')).toBe('ideas:\n- bold colors');
  });

  it('rejects blank input and caps length', () => {
    expect(cleanNoteBody(' \n ')).toBeUndefined();
    expect(cleanNoteBody('x'.repeat(NOTE_MAX + 50))).toHaveLength(NOTE_MAX);
  });
});

describe('note changes', () => {
  it('creates an open, normal-priority note with an optional date', () => {
    expect(createNote('id', '  Call mom ', T0, '2026-10-12')).toEqual({
      id: 'id',
      body: 'Call mom',
      createdAt: T0,
      updatedAt: T0,
      done: false,
      priority: 'normal',
      date: '2026-10-12',
    });
    expect(createNote('id', '   ', T0)).toBeUndefined();
  });

  it('edits text and date, bumping updatedAt', () => {
    const edited = editNote(note('a', { date: '2026-10-12' }), { body: 'New text', date: '2026-10-15' }, T1);
    expect(edited).toMatchObject({ body: 'New text', date: '2026-10-15', updatedAt: T1 });
  });

  it('clears the date when `date: undefined` is passed, and keeps it when the key is absent', () => {
    const dated = note('a', { date: '2026-10-12' });
    expect(editNote(dated, { date: undefined }, T1).date).toBeUndefined();
    expect(editNote(dated, { body: 'x' }, T1).date).toBe('2026-10-12');
  });

  it('ignores blank text and leaves an unchanged note alone', () => {
    const original = note('a');
    expect(editNote(original, { body: '  ' }, T1)).toBe(original);
    expect(editNote(original, { body: 'a' }, T1)).toBe(original);
  });

  it('toggles done and soft-deletes once', () => {
    expect(toggleDone(note('a'), T1)).toMatchObject({ done: true, updatedAt: T1 });
    const deleted = softDelete(note('a'), T1);
    expect(deleted).toMatchObject({ deletedAt: T1, updatedAt: T1 });
    expect(softDelete(deleted, '2026-10-09T10:00:00.000Z')).toBe(deleted);
  });
});

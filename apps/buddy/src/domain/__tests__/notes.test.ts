/// <reference types="jest" />
import {
  cleanNoteBody,
  createNote,
  datesWithNotes,
  editNote,
  NOTE_MAX,
  notesForToday,
  notesOnDate,
  softDelete,
  sortNotes,
  toggleDone,
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

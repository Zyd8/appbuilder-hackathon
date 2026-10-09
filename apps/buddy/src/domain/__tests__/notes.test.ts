/// <reference types="jest" />
import { cleanNoteBody, NOTE_MAX, notesForToday, sortNotes } from '../notes';
import type { Note } from '../types';

function note(id: string, overrides: Partial<Note> = {}): Note {
  return { id, body: id, createdAt: '2026-10-09T08:00:00.000Z', priority: 'normal', done: false, ...overrides };
}

describe('notesForToday', () => {
  it('keeps notes due today and undated notes', () => {
    const notes = [note('a', { due: '2026-10-09' }), note('b', { due: '2026-10-10' }), note('c')];
    expect(notesForToday(notes, '2026-10-09').map((n) => n.id)).toEqual(['a', 'c']);
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

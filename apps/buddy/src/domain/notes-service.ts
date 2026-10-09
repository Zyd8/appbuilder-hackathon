import type { Note } from './types';
import { cleanNoteBody, setNoteDone } from './notes';
import { ServiceError, assertLocalDate, assertTimestamp, requireCommandContext, type AtomicStore, type CommandContext, type CommandResult } from './service-types';

export interface NotesState { notes: Note[] }
export interface NoteIdSource { next(): string }
export interface NoteClock { now(): string }
export interface CreateNoteInput { body: string; priority?: Note['priority']; date?: string; area?: Note['area'] }
export interface CreatedNoteEffect { id: string; note: Note; effect: 'created' }

export function validateCreateNote(input: CreateNoteInput): string {
  if (!input || typeof input.body !== 'string' || input.body.length > 2000) throw new ServiceError('invalid_arguments', 'Invalid note body');
  const body = cleanNoteBody(input.body);
  if (!body) throw new ServiceError('invalid_arguments', 'Note body cannot be blank');
  if (input.date !== undefined) assertLocalDate(input.date);
  if (input.priority !== undefined && !['low', 'normal', 'high'].includes(input.priority)) throw new ServiceError('invalid_arguments', 'Invalid priority');
  if (input.area !== undefined && !['focus', 'creativity', 'knowledge', 'social', 'finance', 'calm', 'health', 'organization'].includes(input.area)) {
    throw new ServiceError('invalid_arguments', 'Invalid area');
  }
  if (Object.keys(input).some((key) => !['body', 'priority', 'date', 'area'].includes(key))) throw new ServiceError('invalid_arguments', 'Unknown note field');
  return body;
}

export class NotesService {
  constructor(private readonly store: AtomicStore<NotesState>, private readonly ids: NoteIdSource, private readonly clock: NoteClock) {}

  async create(context: CommandContext, input: CreateNoteInput): Promise<CommandResult<CreatedNoteEffect>> {
    requireCommandContext(context);
    const body = validateCreateNote(input);
    const fingerprint = JSON.stringify(['notes.create', { ...input, body }]);
    return this.store.transact(context, fingerprint, (state) => {
      const id = this.ids.next();
      const now = this.clock.now();
      if (!id.trim()) throw new ServiceError('invalid_arguments', 'Note ID is blank');
      assertTimestamp(now);
      if (state.notes.some((note) => note.id === id)) throw new ServiceError('idempotency_conflict', 'Note ID already exists');
      const note: Note = { id, body, createdAt: now, updatedAt: now, done: false, priority: input.priority ?? 'normal', date: input.date, area: input.area };
      return { state: { ...state, notes: [...state.notes, note] }, value: { id, note, effect: 'created' } };
    });
  }

  async setDone(context: CommandContext, id: string, desiredDone: boolean): Promise<CommandResult<{ note: Note; effect: 'updated' | 'unchanged' }>> {
    requireCommandContext(context);
    if (typeof desiredDone !== 'boolean') throw new ServiceError('invalid_arguments', 'Desired state must be boolean');
    return this.store.transact(context, JSON.stringify(['notes.setDone', id, desiredDone]), (state) => {
      const note = state.notes.find((item) => item.id === id && !item.deletedAt);
      if (!note) throw new ServiceError('not_found', 'Note was not found');
      const changed = note.done !== desiredDone;
      const now = changed ? this.clock.now() : note.updatedAt;
      if (changed) assertTimestamp(now);
      const updated = setNoteDone(note, desiredDone, now);
      return { state: changed ? { ...state, notes: state.notes.map((item) => item.id === id ? updated : item) } : { ...state }, value: { note: updated, effect: changed ? 'updated' : 'unchanged' } };
    });
  }
}

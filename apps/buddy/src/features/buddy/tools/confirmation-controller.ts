import type { ToolResult } from '../contracts/tool-protocol';
import type { PendingConfirmation } from './tool-types';
import { toolFailure } from './tool-result';
import { NotesCreateHandler } from './notes-create-handler';

/** In-memory pending confirmation. A restart drops it and therefore cannot imply consent. */
export class ConfirmationController {
  private pending: PendingConfirmation | null = null;
  constructor(private readonly notes: NotesCreateHandler, private readonly now: () => string) {}

  current(): PendingConfirmation | null { return this.pending; }

  set(pending: PendingConfirmation): boolean {
    if (this.pending) return false;
    this.pending = pending;
    return true;
  }

  async decide(callId: string, decision: 'confirm' | 'reject' | 'cancel'): Promise<ToolResult<unknown>> {
    const pending = this.pending;
    if (!pending || pending.call.id !== callId)
      return toolFailure(callId, 'notes.create', 'confirmation_cancelled', this.now(), 'No pending confirmation');
    this.pending = null;
    if (decision === 'reject') return toolFailure(callId, 'notes.create', 'confirmation_rejected', this.now(),
      'You declined to save the note', { confirmation: 'rejected' });
    if (decision === 'cancel') return toolFailure(callId, 'notes.create', 'confirmation_cancelled', this.now(),
      'Note creation was cancelled', { confirmation: 'cancelled' });
    return this.notes.execute(pending);
  }
}

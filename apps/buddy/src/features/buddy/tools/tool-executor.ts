import type { BuddyReadPorts } from '../contracts/domain-ports';
import type { ToolCall } from '../contracts/tool-protocol';
import type { ToolExecution } from './tool-types';
import { validateToolCall } from './tool-schemas';
import { executeRead } from './read-handlers';
import { NotesCreateHandler } from './notes-create-handler';
import { ConfirmationController } from './confirmation-controller';
import { toolFailure } from './tool-result';

export class ToolExecutor {
  constructor(private readonly reads: BuddyReadPorts, private readonly notes: NotesCreateHandler,
    readonly confirmations: ConfirmationController, private readonly now: () => string) {}

  async execute(input: ToolCall): Promise<ToolExecution> {
    const validation = validateToolCall(input);
    if (!validation.ok) return { kind: 'result', result: toolFailure(input.id ?? 'unknown', input.name ?? 'unknown',
      validation.code, this.now(), validation.message) };
    const call = validation.call;
    if (call.name !== 'notes.create') return { kind: 'result', result: await executeRead(call, this.reads, this.now) };
    const prepared = await this.notes.prepare(call);
    if ('ok' in prepared) return { kind: 'result', result: prepared };
    if (!this.confirmations.set(prepared)) return { kind: 'result', result: toolFailure(call.id, call.name,
      'unavailable', this.now(), 'Another confirmation is pending') };
    return { kind: 'confirmation', pending: prepared };
  }
}

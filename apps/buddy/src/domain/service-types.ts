/** Domain commands run inside an adapter-owned transaction. The adapter must serialize
 * commands, compare revisions, and persist idempotency receipts with the state. */
export type ServiceErrorCode =
  | 'invalid_arguments' | 'invalid_transition' | 'stale_revision'
  | 'idempotency_conflict' | 'storage_failure' | 'not_found' | 'proof_required'
  | 'boundary_violation' | 'daily_limit';

export class ServiceError extends Error {
  constructor(public readonly code: ServiceErrorCode, message: string) { super(message); }
}

export interface CommandContext {
  expectedRevision: string;
  idempotencyKey: string;
}

export interface CommandResult<T> {
  value: T;
  revision: string;
  idempotentReplay: boolean;
}

/** `run` executes against the latest state while the adapter owns a write lock.
 * An adapter must atomically save the returned state, revision and command receipt.
 * Replayed keys return the original result; a changed command with the same key fails. */
export interface AtomicStore<TState> {
  transact<TResult>(
    context: CommandContext,
    fingerprint: string,
    run: (state: Readonly<TState>) => { state: TState; value: TResult },
  ): Promise<CommandResult<TResult>>;
}

export function requireCommandContext(context: CommandContext): void {
  if (!context.expectedRevision?.trim() || !context.idempotencyKey?.trim()) {
    throw new ServiceError('invalid_arguments', 'Revision and idempotency key are required');
  }
}

export function assertLocalDate(value: string): void {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(NaN);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ServiceError('invalid_arguments', 'Invalid local date');
  }
}

export function assertTimestamp(value: string): void {
  if (!Number.isFinite(Date.parse(value))) throw new ServiceError('invalid_arguments', 'Invalid timestamp');
}

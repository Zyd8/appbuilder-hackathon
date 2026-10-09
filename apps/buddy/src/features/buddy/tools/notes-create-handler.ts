import { cleanNoteBody } from '@/domain/notes';
import type { BuddyAuditPort, BuddyClock, BuddyReadPorts, BuddyWritePorts } from '../contracts/domain-ports';
import type { ToolResult } from '../contracts/tool-protocol';
import type { PendingConfirmation, ValidatedWriteCall } from './tool-types';
import { resultMetadata, toolFailure } from './tool-result';

const fingerprint = (call: ValidatedWriteCall): string => JSON.stringify([
  cleanNoteBody(call.arguments.body), call.arguments.priority ?? 'normal',
  call.arguments.date ?? null, call.arguments.area ?? null,
]);

export class NotesCreateHandler {
  constructor(private readonly reads: BuddyReadPorts, private readonly writes: BuddyWritePorts,
    private readonly clock: BuddyClock, private readonly audit?: BuddyAuditPort) {}

  async prepare(call: ValidatedWriteCall): Promise<PendingConfirmation | ToolResult<never>> {
    const key = call.arguments.idempotencyKey;
    const fp = fingerprint(call);
    try {
      const notes = await this.reads.notes.list();
      if (notes.durability !== 'durable') return toolFailure(call.id, call.name, 'preview_only', this.clock.now(),
        'Notes must be backed by durable local storage');
      const receipt = await this.reads.notes.createReceipt(key);
      if (receipt.durability !== 'durable') return toolFailure(call.id, call.name, 'preview_only', this.clock.now(),
        'A command receipt cannot be verified from preview data');
      if (receipt.value) {
        const saved = receipt.value;
        if (JSON.stringify([saved.body, saved.priority, saved.date ?? null, saved.area ?? null]) !== fp)
          return toolFailure(call.id, call.name, 'idempotency_conflict', this.clock.now(),
            'This command key was used for different note content');
      } else if (notes.revision !== call.arguments.expectedRevision) {
        return toolFailure(call.id, call.name, 'stale_revision', this.clock.now(), 'Notes changed. Read them again before saving');
      }
      const body = cleanNoteBody(call.arguments.body);
      if (!body) return toolFailure(call.id, call.name, 'invalid_arguments', this.clock.now(), 'Note body is empty');
      return { call: { ...call, arguments: { ...call.arguments, body } }, fingerprint: fp,
        descriptor: { callId: call.id, tool: 'notes.create', title: 'Save this note?', body,
          metadata: { priority: call.arguments.priority ?? 'normal',
            ...(call.arguments.date ? { date: call.arguments.date } : {}),
            ...(call.arguments.area ? { area: call.arguments.area } : {}) },
          reason: 'You asked Buddy to add a note or todo.', privacyImpact: 'Saved on this device; existing notes sync may back it up to your account.',
          storageImpact: 'Adds one local note after confirmation.' } };
    } catch {
      return toolFailure(call.id, call.name, 'unavailable', this.clock.now(), 'Could not inspect local notes');
    }
  }

  async execute(pending: PendingConfirmation): Promise<ToolResult<unknown>> {
    const { call } = pending;
    let latest;
    try { latest = await this.reads.notes.list(); }
    catch { return toolFailure(call.id, call.name, 'unavailable', this.clock.now(), 'Could not recheck local notes'); }
    if (latest.durability !== 'durable') return toolFailure(call.id, call.name, 'preview_only', this.clock.now(), 'Notes are preview data');
    // The command port atomically rejects a new stale key and replays a matching durable receipt.
    let created;
    try { created = await this.writes.notes.create(call.arguments); }
    catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      const mapped = code === 'stale_revision' || code === 'idempotency_conflict' || code === 'invalid_arguments'
        ? code : 'storage_failure';
      this.audit?.record({ callId: call.id, tool: call.name, outcome: mapped, observedAt: this.clock.now() });
      return toolFailure(call.id, call.name, mapped, this.clock.now(), 'Local note write did not complete');
    }
    try {
      const saved = await this.reads.notes.byId(created.id);
      const value = saved.value;
      if (saved.durability !== 'durable' || saved.revision !== created.revision || !value ||
          value.id !== created.id || value.body !== call.arguments.body || value.done !== false ||
          value.priority !== (call.arguments.priority ?? 'normal') ||
          value.date !== call.arguments.date || value.area !== call.arguments.area) throw new Error('Read-back mismatch');
      const result: ToolResult<unknown> = { ok: true, callId: call.id, name: call.name,
        data: { id: value.id, body: value.body, priority: value.priority, date: value.date,
          area: value.area, revision: created.revision, idempotentReplay: created.idempotentReplay },
        metadata: resultMetadata(call.name, saved.observedAt, { revision: saved.revision,
          provenance: saved.provenance, schemaVersion: saved.schemaVersion, durability: saved.durability,
          freshness: 'current', execution: 'local', confirmation: 'confirmed' }) };
      this.audit?.record({ callId: call.id, tool: call.name, outcome: 'confirmed', observedAt: this.clock.now() });
      return result;
    } catch {
      this.audit?.record({ callId: call.id, tool: call.name, outcome: 'read_back_failed', observedAt: this.clock.now() });
      return toolFailure(call.id, call.name, 'read_back_failed', this.clock.now(),
        'The note write could not be verified', { confirmation: 'confirmed', execution: 'local' });
    }
  }
}

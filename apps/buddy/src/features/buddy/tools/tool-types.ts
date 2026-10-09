import type { ConfirmationDescriptor, NotesCreateArguments, ReadToolName, ToolCall, ToolResult } from '../contracts/tool-protocol';

export type ValidatedReadCall = { id: string; name: ReadToolName; arguments: { id?: string } };
export type ValidatedWriteCall = { id: string; name: 'notes.create'; arguments: NotesCreateArguments };
export type ValidatedToolCall = ValidatedReadCall | ValidatedWriteCall;

export type ValidationResult =
  | { ok: true; call: ValidatedToolCall }
  | { ok: false; code: 'invalid_tool' | 'invalid_arguments'; message: string; call?: ToolCall };

export interface PendingConfirmation {
  call: ValidatedWriteCall;
  descriptor: ConfirmationDescriptor;
  fingerprint: string;
}

export type ToolExecution =
  | { kind: 'result'; result: ToolResult<unknown> }
  | { kind: 'confirmation'; pending: PendingConfirmation };

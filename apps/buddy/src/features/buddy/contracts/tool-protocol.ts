import type { LifeArea, Note } from '../../../domain/types';

export const READ_TOOL_NAMES = [
  'onboarding.context.read', 'profile.read', 'stats.summary.read',
  'stats.breakdown.read', 'insights.ordered.read', 'checkin.current.read',
  'quests.board.read', 'quests.history.read', 'quests.detail.read',
  'nudge.current.read', 'progress.xp_level_rank.read', 'notes.read',
  'memory.documents.read', 'model.status', 'input.capabilities.read',
] as const;
export type ReadToolName = (typeof READ_TOOL_NAMES)[number];
export type WriteToolName = 'notes.create';
export type ToolName = ReadToolName | WriteToolName;
export type PermissionClass = 'read-local' | 'always-confirmed-sensitive-write';
export type Durability = 'durable' | 'session' | 'preview';
export type ToolErrorCode =
  | 'invalid_tool' | 'invalid_arguments' | 'stale_revision' | 'preview_only'
  | 'confirmation_rejected' | 'confirmation_cancelled' | 'idempotency_conflict'
  | 'storage_failure' | 'read_back_failed' | 'unavailable' | 'cancelled';

/** Parsed model requests are untrusted until a registry handler validates exact arguments. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface NotesCreateArguments {
  body: string;
  priority?: Note['priority'];
  date?: string;
  area?: LifeArea;
  expectedRevision: string;
  idempotencyKey: string;
}

export interface ConfirmationDescriptor {
  callId: string;
  tool: WriteToolName;
  title: string;
  body: string;
  metadata: Readonly<Record<string, string>>;
  reason: string;
  privacyImpact: string;
  storageImpact: string;
}

export interface ToolResultMetadata {
  source: string;
  schemaVersion: number;
  serviceVersion: string;
  revision: string;
  observedAt: string;
  freshness: 'current' | 'stale' | 'unknown';
  provenance: string;
  durability: Durability;
  execution: 'local' | 'none';
  confirmation: 'not-required' | 'confirmed' | 'rejected' | 'cancelled';
  truncated: boolean;
}

export type ToolResult<T> =
  | { ok: true; callId: string; name: ToolName; data: T; metadata: ToolResultMetadata }
  | { ok: false; callId: string; name: ToolName; error: { code: ToolErrorCode; message: string }; metadata: ToolResultMetadata };

export const WRITE_PERMISSION: PermissionClass = 'always-confirmed-sensitive-write';

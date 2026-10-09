import { READ_TOOL_NAMES, type ReadToolName, type ToolName } from '../contracts/tool-protocol';
import type { AIEngineRequest } from '../contracts/ai-engine';

const empty = { type: 'object', properties: {}, additionalProperties: false } as const;
const detail = { type: 'object', properties: { id: { type: 'string', minLength: 1, maxLength: 128 } },
  required: ['id'], additionalProperties: false } as const;
const note = { type: 'object', properties: {
  body: { type: 'string', minLength: 1, maxLength: 2000 },
  priority: { type: 'string', enum: ['low', 'normal', 'high'] },
  date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  area: { type: 'string', enum: ['focus', 'creativity', 'knowledge', 'social', 'finance', 'calm', 'health', 'organization'] },
  expectedRevision: { type: 'string', minLength: 1, maxLength: 128 },
  idempotencyKey: { type: 'string', pattern: '^[A-Za-z0-9_-]{16,128}$' },
}, required: ['body', 'expectedRevision', 'idempotencyKey'], additionalProperties: false } as const;

export const DISABLED_WRITE_TOOLS = [
  'notes.update', 'notes.delete', 'checkin.upsert', 'quests.complete', 'quests.skip',
  'quests.reroll', 'progress.award', 'profile.update', 'memory.update', 'model.install',
] as const;

export interface ToolManifestEntry {
  name: ToolName;
  permission: 'read-local' | 'always-confirmed-sensitive-write';
  parameters: Record<string, unknown>;
}

export const TOOL_MANIFEST: readonly ToolManifestEntry[] = [
  ...READ_TOOL_NAMES.map((name: ReadToolName) => ({ name, permission: 'read-local' as const,
    parameters: name === 'quests.detail.read' ? detail : empty })),
  { name: 'notes.create', permission: 'always-confirmed-sensitive-write', parameters: note },
];

export function modelToolDefinitions(): NonNullable<AIEngineRequest['tools']> {
  return TOOL_MANIFEST.map(({ name, parameters }) => ({ type: 'function' as const,
    function: { name, description: name === 'notes.create' ? 'Create a local note after user confirmation' : `Read ${name} from local app state`,
      parameters } }));
}

import type { ReadSnapshot } from '../contracts/domain-ports';
import type { ToolErrorCode, ToolName, ToolResult, ToolResultMetadata } from '../contracts/tool-protocol';

const SERVICE_VERSION = 'buddy-tools/1';
const privateKey = (key: string) => /(?:uri|path)$/i.test(key) || /^proofPhoto$/i.test(key);

function limit(value: unknown, depth: number, state: { truncated: boolean }): unknown {
  if (depth > 6) { state.truncated = true; return null; }
  if (typeof value === 'string') {
    if (value.length <= 2048) return value;
    state.truncated = true; return value.slice(0, 2048);
  }
  if (Array.isArray(value)) {
    if (value.length > 40) state.truncated = true;
    return value.slice(0, 40).map((entry) => limit(entry, depth + 1, state));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 40) state.truncated = true;
    const output: Record<string, unknown> = {};
    for (const [key, entry] of entries.slice(0, 40)) {
      if (privateKey(key)) { state.truncated = true; continue; }
      output[key] = limit(entry, depth + 1, state);
    }
    return output;
  }
  return value;
}

export function resultMetadata(name: string, now: string, overrides: Partial<ToolResultMetadata> = {}): ToolResultMetadata {
  return { source: name, schemaVersion: 1, serviceVersion: SERVICE_VERSION,
    revision: 'unknown', observedAt: now, freshness: 'unknown', provenance: 'app-owned tool',
    durability: 'session', execution: 'none', confirmation: 'not-required', truncated: false, ...overrides };
}

export function readResult<T>(callId: string, name: ToolName, snapshot: ReadSnapshot<T>): ToolResult<unknown> {
  const state = { truncated: false };
  let data = limit(snapshot.value, 0, state);
  if (JSON.stringify(data).length > 8192) { data = { omitted: 'Tool result exceeds output limit' }; state.truncated = true; }
  return { ok: true, callId, name, data,
    metadata: resultMetadata(name, snapshot.observedAt, { revision: snapshot.revision,
      schemaVersion: snapshot.schemaVersion, provenance: snapshot.provenance,
      durability: snapshot.durability, freshness: snapshot.durability === 'preview' ? 'unknown' : 'current',
      execution: 'local', truncated: state.truncated }) };
}

export function toolFailure(callId: string, name: string, code: ToolErrorCode, now: string,
  message: string, metadata: Partial<ToolResultMetadata> = {}): ToolResult<never> {
  return { ok: false, callId, name: name as ToolName, error: { code, message },
    metadata: resultMetadata(name, now, metadata) };
}

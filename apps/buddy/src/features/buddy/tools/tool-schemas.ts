import { LIFE_AREAS } from '@/domain/types';
import { NOTE_MAX } from '@/domain/notes';
import { READ_TOOL_NAMES, type NotesCreateArguments, type ToolCall } from '../contracts/tool-protocol';
import type { AIEngineOutput } from '../contracts/ai-engine';
import type { ValidatedReadCall, ValidatedWriteCall, ValidationResult } from './tool-types';

export const MAX_ARGUMENT_BYTES = 16 * 1024;
export const MAX_ARGUMENT_DEPTH = 6;
const READ_NAMES: ReadonlySet<string> = new Set(READ_TOOL_NAMES);
const ID = /^[A-Za-z0-9_-]{1,128}$/;
const KEY = /^[A-Za-z0-9_-]{16,128}$/;
const validDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const keysAre = (value: Record<string, unknown>, allowed: readonly string[]) =>
  Object.keys(value).every((key) => allowed.includes(key));
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function utf8Bytes(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 0x80) count += 1;
    else if (code < 0x800) count += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) { count += 4; i += 1; }
    else count += 3;
  }
  return count;
}

/** Parses JSON with duplicate-key detection. JSON.parse silently overwrites duplicate keys. */
function parseStrictJson(source: string): unknown {
  let cursor = 0;
  const whitespace = () => { while (/\s/.test(source[cursor] ?? '')) cursor += 1; };
  const value = (depth: number): unknown => {
    whitespace();
    if (depth > MAX_ARGUMENT_DEPTH) throw new Error('Argument nesting is too deep');
    const ch = source[cursor];
    if (ch === '{') {
      cursor += 1; whitespace();
      const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      if (source[cursor] === '}') { cursor += 1; return out; }
      while (true) {
        whitespace();
        const key = stringToken(); whitespace();
        if (source[cursor++] !== ':') throw new Error('Malformed JSON');
        if (Object.prototype.hasOwnProperty.call(out, key)) throw new Error('Duplicate argument key');
        out[key] = value(depth + 1); whitespace();
        const end = source[cursor++];
        if (end === '}') return out;
        if (end !== ',') throw new Error('Malformed JSON');
      }
    }
    if (ch === '[') {
      cursor += 1; whitespace(); const out: unknown[] = [];
      if (source[cursor] === ']') { cursor += 1; return out; }
      while (true) {
        if (out.length >= 64) throw new Error('Argument array is too long');
        out.push(value(depth + 1)); whitespace();
        const end = source[cursor++];
        if (end === ']') return out;
        if (end !== ',') throw new Error('Malformed JSON');
      }
    }
    if (ch === '"') return stringToken();
    const primitive = /^(true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(source.slice(cursor));
    if (!primitive) throw new Error('Malformed JSON');
    cursor += primitive[0].length;
    return JSON.parse(primitive[0]) as unknown;
  };
  const stringToken = (): string => {
    if (source[cursor] !== '"') throw new Error('Malformed JSON');
    const start = cursor++;
    while (cursor < source.length) {
      if (source[cursor] === '\\') { cursor += 2; continue; }
      if (source[cursor++] === '"') return JSON.parse(source.slice(start, cursor)) as string;
    }
    throw new Error('Malformed JSON');
  };
  const parsed = value(0); whitespace();
  if (cursor !== source.length) throw new Error('Trailing JSON content');
  return parsed;
}

function bounded(value: unknown, depth = 0): boolean {
  if (depth > MAX_ARGUMENT_DEPTH) return false;
  if (typeof value === 'string') return value.length <= MAX_ARGUMENT_BYTES;
  if (typeof value === 'number') return Number.isFinite(value);
  if (value === null || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length <= 64 && value.every((item) => bounded(item, depth + 1));
  if (record(value)) return Object.keys(value).length <= 32 && Object.entries(value).every(([key, item]) =>
    key.length <= 128 && bounded(item, depth + 1));
  return false;
}

export function validateToolCall(input: unknown): ValidationResult {
  if (!record(input) || !keysAre(input, ['id', 'name', 'arguments']) ||
      typeof input.id !== 'string' || !ID.test(input.id) || typeof input.name !== 'string')
    return { ok: false, code: 'invalid_arguments', message: 'Malformed tool call' };
  const call = input as unknown as ToolCall;
  if (!READ_NAMES.has(call.name) && call.name !== 'notes.create')
    return { ok: false, code: 'invalid_tool', message: 'Tool is not enabled', call };
  let args: unknown = call.arguments;
  try {
    const raw = typeof args === 'string' ? args : JSON.stringify(args);
    if (typeof raw !== 'string' || utf8Bytes(raw) > MAX_ARGUMENT_BYTES) throw new Error('Argument payload is too large');
    args = typeof args === 'string' ? parseStrictJson(args) : args;
    if (!record(args) || !bounded(args)) throw new Error('Invalid argument structure');
  } catch {
    return { ok: false, code: 'invalid_arguments', message: 'Invalid tool arguments', call };
  }
  if (call.name !== 'notes.create') {
    if (call.name === 'quests.detail.read') {
      if (!keysAre(args, ['id']) || typeof args.id !== 'string' || !ID.test(args.id))
        return { ok: false, code: 'invalid_arguments', message: 'A quest ID is required', call };
    } else if (call.name === 'notes.read') {
      if (!keysAre(args, ['id']) || (args.id !== undefined &&
          (typeof args.id !== 'string' || !ID.test(args.id))))
        return { ok: false, code: 'invalid_arguments', message: 'Invalid note ID', call };
    } else if (Object.keys(args).length !== 0) {
      return { ok: false, code: 'invalid_arguments', message: 'This read tool accepts no arguments', call };
    }
    return { ok: true, call: { id: call.id, name: call.name, arguments: args } as ValidatedReadCall };
  }
  if (!keysAre(args, ['body', 'priority', 'date', 'area', 'expectedRevision', 'idempotencyKey']) ||
      typeof args.body !== 'string' || !args.body.trim() || args.body.length > NOTE_MAX ||
      typeof args.expectedRevision !== 'string' || !args.expectedRevision.trim() || args.expectedRevision.length > 128 ||
      typeof args.idempotencyKey !== 'string' || !KEY.test(args.idempotencyKey) ||
      (args.priority !== undefined && !['low', 'normal', 'high'].includes(String(args.priority))) ||
      (args.area !== undefined && !LIFE_AREAS.includes(args.area as typeof LIFE_AREAS[number])) ||
      (args.date !== undefined && !validDate(args.date)))
    return { ok: false, code: 'invalid_arguments', message: 'Invalid note arguments', call };
  return { ok: true, call: { id: call.id, name: 'notes.create',
    arguments: args as unknown as NotesCreateArguments } satisfies ValidatedWriteCall };
}

/** Exactly one structured final or one structured tool call; no executable trailing text. */
export function parseModelEnvelope(raw: unknown): AIEngineOutput | null {
  try {
    const output = typeof raw === 'string' ? parseStrictJson(raw) : raw;
    if (!record(output) || !keysAre(output, ['kind', 'text', 'toolCall'])) return null;
    if (output.kind === 'final' && typeof output.text === 'string' && output.text.trim() &&
        !/"(?:toolCall|name)"\s*:\s*(?:\{|"(?:notes\.|quests\.|profile\.|stats\.|progress\.|model\.|memory\.))/.test(output.text) &&
        !Object.prototype.hasOwnProperty.call(output, 'toolCall')) return { kind: 'final', text: output.text };
    if (output.kind === 'toolCall' && !Object.prototype.hasOwnProperty.call(output, 'text') &&
        validateToolCall(output.toolCall).ok) return { kind: 'toolCall', toolCall: output.toolCall as ToolCall };
    return null;
  } catch { return null; }
}

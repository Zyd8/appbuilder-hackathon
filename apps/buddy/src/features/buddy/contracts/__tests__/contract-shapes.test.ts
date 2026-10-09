import { READ_TOOL_NAMES, WRITE_PERMISSION } from '../index';
import type {
  AIEngineOutput, NormalizedAssistantResponse, NotesCreateArguments,
  ToolResult, ToolResultMetadata,
} from '../index';

const metadata: ToolResultMetadata = {
  source: 'local-test', schemaVersion: 1, serviceVersion: '1', revision: 'r1',
  observedAt: '2026-01-01T00:00:00.000Z', freshness: 'current', provenance: 'test',
  durability: 'durable', execution: 'local', confirmation: 'not-required', truncated: false,
};

describe('frozen Buddy contracts', () => {
  it('exposes only the named first-slice read tools and one confirmed write class', () => {
    expect(READ_TOOL_NAMES).toHaveLength(15);
    expect(new Set(READ_TOOL_NAMES).size).toBe(READ_TOOL_NAMES.length);
    expect(WRITE_PERMISSION).toBe('always-confirmed-sensitive-write');
    expect(READ_TOOL_NAMES).not.toContain('notes.create');
  });

  it('keeps model final and tool-call outputs mutually exclusive', () => {
    const final: AIEngineOutput = { kind: 'final', text: 'Done' };
    const call: AIEngineOutput = {
      kind: 'toolCall', toolCall: { id: 'c1', name: 'notes.create', arguments: {} },
    };
    expect(final.kind).toBe('final');
    expect(call.kind).toBe('toolCall');
    // @ts-expect-error A final response cannot carry a tool call.
    const invalid: AIEngineOutput = { kind: 'final', text: 'Done', toolCall: call.toolCall };
    expect(invalid.toolCall).toBeDefined();
  });

  it('requires write revision/idempotency and result metadata at compile time', () => {
    const request: NotesCreateArguments = { body: 'Call dentist', expectedRevision: 'r1', idempotencyKey: '1234567890abcdef' };
    const result: ToolResult<{ id: string }> = { ok: true, callId: 'c1', name: 'notes.create', data: { id: 'n1' }, metadata };
    expect(request.expectedRevision).toBe('r1');
    expect(result.metadata.durability).toBe('durable');
    // @ts-expect-error A write cannot omit revision and idempotency key.
    const incomplete: NotesCreateArguments = { body: 'Call dentist' };
    // @ts-expect-error Results must carry provenance and durability metadata.
    const withoutMetadata: ToolResult<{ id: string }> = { ok: true, callId: 'c1', name: 'notes.create', data: { id: 'n1' } };
    expect(incomplete.body).toBeDefined();
    expect(withoutMetadata.ok).toBe(true);
  });

  it('has no raw reasoning, path, SQL, or network callback presentation fields', () => {
    const response: NormalizedAssistantResponse = {
      whatIChecked: ['Notes were checked'], finalAnswer: 'I added the todo.', toolResults: [], state: 'complete',
    };
    expect(Object.keys(response).sort()).toEqual(['finalAnswer', 'state', 'toolResults', 'whatIChecked']);
    // @ts-expect-error Raw model reasoning is not presentation data.
    response.reasoning = 'private';
    // @ts-expect-error No arbitrary file path callback exists in the chat response.
    response.readPath = () => '/private';
    expect(response.finalAnswer).toBe('I added the todo.');
  });
});

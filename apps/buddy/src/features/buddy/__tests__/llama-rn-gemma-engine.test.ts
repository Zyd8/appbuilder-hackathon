import { LlamaRnGemmaEngine } from '../llama-rn-gemma-engine';
import type { ModelManager, VerifiedModel } from '../model-manager';

jest.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///private/app' } },
  Directory: class { uri = 'file:///private/app/buddy-models'; },
  File: class {},
  FileMode: { ReadOnly: 'r' },
}));

const artifact = { uri: 'file:///private/app/buddy-models/model.gguf' };
const verified: VerifiedModel = { id: 'gemma4-e2b', model: artifact as never, projector: null, identity: 'artifact-A' };
const manager = {
  readiness: jest.fn(async () => 'ready'),
  verified: jest.fn(async () => verified),
} as unknown as ModelManager;

describe('Gemma native adapter', () => {
  it('reports native module unavailability and never falls back', async () => {
    const engine = new LlamaRnGemmaEngine(manager, async () => { throw new Error('native unavailable'); });
    expect(await engine.readiness('gemma4-e2b')).toBe('incompatible');
    await expect(engine.initialize('gemma4-e2b')).rejects.toThrow('native unavailable');
  });

  it('reuses matching context, cancels, and releases on identity change', async () => {
    const release = jest.fn(async () => {});
    const stopCompletion = jest.fn(async () => {});
    const completion = jest.fn(async () => ({ content: 'Hello', tool_calls: [] }));
    const initLlama = jest.fn(async () => ({ release, stopCompletion, completion }));
    const engine = new LlamaRnGemmaEngine(manager, async () => ({ initLlama }) as never);
    expect((await engine.initialize('gemma4-e2b')).audio).toBe(false);
    await engine.initialize('gemma4-e2b');
    expect(initLlama).toHaveBeenCalledTimes(1);
    expect(await engine.generate({ prompt: 'hi', maxOutputTokens: 16 })).toEqual({ kind: 'final', text: 'Hello' });
    await engine.cancel();
    expect(stopCompletion).toHaveBeenCalledTimes(1);
    verified.identity = 'artifact-B';
    await engine.initialize('gemma4-e2b');
    expect(release).toHaveBeenCalledTimes(1);
    expect(initLlama).toHaveBeenCalledTimes(2);
    await engine.dispose();
  });

  it('does not claim vision without a verified initialized projector', async () => {
    const initLlama = jest.fn(async () => ({
      release: async () => {},
      initMultimodal: async () => { throw new Error('projector failed'); },
      getMultimodalSupport: async () => ({ vision: true }),
    }));
    verified.projector = artifact as never;
    const engine = new LlamaRnGemmaEngine(manager, async () => ({ initLlama }) as never);
    expect((await engine.initialize('gemma4-e2b')).vision).toBe(false);
    await expect(engine.generate({ prompt: 'view', images: [{ uri: 'file:///image', mimeType: 'image/jpeg' }], maxOutputTokens: 10 })).rejects.toThrow('Vision projector');
    verified.projector = null;
  });

  it('passes bounded tool schemas to native completion and rejects mixed output', async () => {
    const completion = jest.fn(async (_params: unknown): Promise<{ content: string; tool_calls: { type: string; id?: string; function: { name: string; arguments: string } }[] }> => ({
      content: '', tool_calls: [{ type: 'function', id: 'call-1', function: { name: 'notes.read', arguments: '{}' } }],
    }));
    const engine = new LlamaRnGemmaEngine(manager, async () => ({
      initLlama: async () => ({
        release: async () => {}, completion,
        model: { chatTemplates: { jinja: { toolUse: true, toolUseCaps: { tools: true, toolCalls: true } } } },
      }),
    }) as never);
    await engine.initialize('gemma4-e2b');
    const tools = [{ type: 'function' as const, function: { name: 'notes.read', parameters: { type: 'object' } } }];
    expect(await engine.generate({ prompt: 'notes', maxOutputTokens: 16, tools, toolChoice: 'auto' })).toEqual({
      kind: 'toolCall', toolCall: { id: 'call-1', name: 'notes.read', arguments: '{}' },
    });
    expect(completion.mock.calls[0][0]).toMatchObject({ tools, tool_choice: 'auto', parallel_tool_calls: false });
    completion.mockResolvedValueOnce({ content: 'Also done', tool_calls: [{ type: 'function', function: { name: 'notes.read', arguments: '{}' } }] });
    await expect(engine.generate({ prompt: 'notes', maxOutputTokens: 16 })).rejects.toThrow('Ambiguous');
    expect(engine.capabilities()).toBeNull();
  });

  it('preserves duplicate JSON keys for strict tool validation', async () => {
    const raw = '{"body":"first","body":"second"}';
    const engine = new LlamaRnGemmaEngine(manager, async () => ({
      initLlama: async () => ({
        release: async () => {},
        completion: async () => ({ content: '', tool_calls: [{
          type: 'function', function: { name: 'notes.create', arguments: raw },
        }] }),
      }),
    }) as never);
    await engine.initialize('gemma4-e2b');
    expect(await engine.generate({ prompt: 'add note', maxOutputTokens: 16 })).toEqual({
      kind: 'toolCall', toolCall: { id: 'native-call-1', name: 'notes.create', arguments: raw },
    });
  });
});

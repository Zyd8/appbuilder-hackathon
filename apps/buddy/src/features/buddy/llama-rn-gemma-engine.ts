import type { LlamaContext } from 'llama.rn';

import type { AIEngine, AIEngineCapabilities, AIEngineOutput, AIEngineReadiness, AIEngineRequest } from './contracts/ai-engine';
import { catalogEntry } from './model-catalog';
import { ModelManager, type VerifiedModel } from './model-manager';
import { nativeModelPath } from './model-paths';
import type { BuddyModelId } from './types';

type Runtime = typeof import('llama.rn');
const loadRuntime = (): Promise<Runtime> => import('llama.rn');

export class LlamaRnGemmaEngine implements AIEngine {
  private loaded: { key: string; context: LlamaContext; capabilities: AIEngineCapabilities } | null = null;
  private runtime: Runtime | null = null;

  constructor(private readonly manager: ModelManager = new ModelManager(), private readonly runtimeLoader = loadRuntime) {}

  async readiness(modelId: string): Promise<AIEngineReadiness> {
    try {
      catalogEntry(modelId);
      const state = await this.manager.readiness(modelId as BuddyModelId);
      if (state !== 'ready') return state;
      await this.runtimeLoader();
      return 'ready';
    } catch {
      return 'incompatible';
    }
  }

  async initialize(modelId: string): Promise<AIEngineCapabilities> {
    const entry = catalogEntry(modelId);
    const verified = await this.manager.verified(entry.id);
    const key = this.contextKey(verified);
    if (this.loaded?.key === key) return this.loaded.capabilities;
    await this.dispose();
    let context: LlamaContext | null = null;
    try {
      this.runtime = await this.runtimeLoader();
      context = await this.runtime.initLlama({
        model: nativeModelPath(verified.model), n_ctx: entry.contextTokens,
        n_batch: 256, n_gpu_layers: 0, use_mlock: false,
      });
      let vision = false;
      if (verified.projector) {
        try {
          await context.initMultimodal({ path: nativeModelPath(verified.projector), use_gpu: false });
          vision = (await context.getMultimodalSupport()).vision === true;
        } catch {
          vision = false;
        }
      }
      const templates = context.model?.chatTemplates?.jinja;
      const toolCaps = templates?.toolUse ? templates.toolUseCaps : templates?.defaultCaps;
      const capabilities: AIEngineCapabilities = {
        text: true, vision, audio: false,
        functionCalling: Boolean(toolCaps?.tools && toolCaps?.toolCalls),
        contextTokens: entry.contextTokens,
      };
      this.loaded = { key, context, capabilities };
      return capabilities;
    } catch (error) {
      if (context) await context.release().catch(() => undefined);
      this.loaded = null;
      throw error;
    }
  }

  async generate(request: AIEngineRequest): Promise<AIEngineOutput> {
    const active = this.loaded;
    if (!active) throw new Error('Selected model is not initialized');
    if (request.signal?.aborted) throw new Error('Generation cancelled');
    if (request.images?.length && !active.capabilities.vision) throw new Error('Vision projector is unavailable');
    if (request.tools?.length && !active.capabilities.functionCalling) throw new Error('Selected model does not support native function calling');
    const onAbort = () => { void active.context.stopCompletion(); };
    request.signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const result = await active.context.completion({
        messages: [{ role: 'user', content: request.prompt }],
        n_predict: Math.max(1, Math.min(request.maxOutputTokens, 1024)),
        temperature: 0.4, top_p: 0.95,
        tools: request.tools ? [...request.tools] : undefined,
        tool_choice: request.toolChoice,
        parallel_tool_calls: false,
        media_paths: request.images?.map((image) => image.uri.replace(/^file:\/\//, '')),
      });
      if (request.signal?.aborted) throw new Error('Generation cancelled');
      const calls = result.tool_calls ?? [];
      if (calls.length > 1) throw new Error('Multiple tool calls are unsupported');
      if (calls.length === 1) {
        if ((result.content || '').trim()) throw new Error('Ambiguous mixed tool and final response');
        const call = calls[0];
        return { kind: 'toolCall', toolCall: {
          id: call.id ?? 'native-call-1', name: call.function.name,
          // Preserve the exact native JSON for the registry's duplicate-key and size checks.
          arguments: call.function.arguments,
        } };
      }
      const text = (result.content || result.text || '').trim();
      if (!text) throw new Error('The on-device model returned an empty response');
      return { kind: 'final', text };
    } catch (error) {
      await this.dispose();
      throw error;
    } finally {
      request.signal?.removeEventListener('abort', onAbort);
    }
  }

  async cancel(): Promise<void> {
    if (this.loaded) await this.loaded.context.stopCompletion();
  }

  async dispose(): Promise<void> {
    const old = this.loaded;
    this.loaded = null;
    if (old) await old.context.release();
  }

  capabilities(): AIEngineCapabilities | null { return this.loaded?.capabilities ?? null; }

  private contextKey(verified: VerifiedModel): string {
    return `${verified.identity}:cpu:batch256:mlock0`;
  }
}

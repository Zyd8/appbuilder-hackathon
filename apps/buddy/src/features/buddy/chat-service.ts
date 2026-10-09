import type { AIEngine } from './contracts/ai-engine';
import { LlamaRnGemmaEngine } from './llama-rn-gemma-engine';
import { mediaUrisFor } from './prompt-builder';
import { normalizeAssistantOutput } from './response-normalizer';
import type { ChatAttachment } from './types';

export {
  getBuddyChatController, releaseBuddyChatController, chatHistory,
  type BuddyChatController, type BuddyChatStart, type BuddyChatResult,
} from './buddy-chat-controller';

export type GenerateInput = {
  modelId: string;
  /** Kept for the Phase-1 caller; model paths are resolved and verified by AIEngine. */
  modelPath?: string;
  mmprojPath?: string;
  prompt: string;
  attachments?: ChatAttachment[];
  signal?: AbortSignal;
};

let engine: AIEngine = new LlamaRnGemmaEngine();
let initializedModel: string | null = null;

/** Test seam for fake engines; the coordinator can also supply an agent service here. */
export function setBuddyEngine(next: AIEngine): void { engine = next; initializedModel = null; }

export async function isOnDeviceRuntimeAvailable(modelId = 'gemma4-e2b'): Promise<boolean> {
  return (await engine.readiness(modelId)) === 'ready';
}

export async function unloadBuddyModel(): Promise<void> {
  initializedModel = null;
  await engine.dispose();
}

/** One local model turn. Tool requests are never presented as answer text. */
export async function generateBuddyReply(input: GenerateInput): Promise<string> {
  try {
    if (initializedModel !== input.modelId) {
      await engine.initialize(input.modelId);
      initializedModel = input.modelId;
    }
    const { imagePaths } = mediaUrisFor(input.attachments ?? []);
    const capabilities = engine.capabilities();
    const images = capabilities?.vision ? (input.attachments ?? []).filter((item) => item.status === 'ready' && item.kind === 'image').map((item) => ({ uri: item.uri, mimeType: item.mimeType ?? 'image/jpeg' })) : [];
    const prompt = imagePaths.length && !capabilities?.vision
      ? `${input.prompt}\n\nApp observation: ${imagePaths.length} image attachment(s) could not be read because vision is unavailable.`
      : input.prompt;
    const output = await engine.generate({ prompt, maxOutputTokens: 320, images, signal: input.signal });
    const normalized = normalizeAssistantOutput(output, prompt);
    if (!normalized.ok) throw new Error(normalized.reason === 'tool-call' ? 'Buddy requested an unavailable tool.' : 'Buddy returned an unreadable answer.');
    return normalized.answer;
  } catch (cause) {
    if (cause instanceof Error) throw cause;
    throw new Error('Buddy could not run the on-device model.');
  }
}

export function loadedSupportsVision(): boolean { return Boolean(engine.capabilities()?.vision); }

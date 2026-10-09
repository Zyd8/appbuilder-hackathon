import type { LlamaContext } from 'llama.rn';

import { mediaUrisFor } from './prompt-builder';
import type { ChatAttachment } from './types';

export type GenerateInput = {
  modelId: string;
  modelPath: string;
  mmprojPath?: string;
  prompt: string;
  attachments?: ChatAttachment[];
};

/** One context at a time; the native engine is expensive to build and must be reused per turn. */
let loaded: { modelId: string; context: LlamaContext; vision: boolean } | null = null;

/** `llama.rn` accepts plain paths, but tolerate a `file://` URI from cached state. */
function toNativePath(uriOrPath: string): string {
  return uriOrPath.startsWith('file://') ? uriOrPath.slice('file://'.length) : uriOrPath;
}

/** `llama.rn` is a native module, so it only resolves inside a development/native build. */
async function llama() {
  return import('llama.rn');
}

export async function isOnDeviceRuntimeAvailable(): Promise<boolean> {
  try {
    await llama();
    return true;
  } catch {
    return false;
  }
}

export async function unloadBuddyModel(): Promise<void> {
  const current = loaded;
  loaded = null;
  if (!current) return;
  try {
    await current.context.release();
  } catch {
    // The context is already gone; nothing to release.
  }
}

async function ensureLoaded(input: GenerateInput): Promise<{ context: LlamaContext; vision: boolean }> {
  if (loaded && loaded.modelId === input.modelId) return loaded;
  await unloadBuddyModel();

  const { initLlama } = await llama();
  const context = await initLlama({
    model: toNativePath(input.modelPath),
    n_ctx: 4096,
    n_batch: 256,
    // CPU only: this build has no working GPU/NPU backend on the device, and asking for
    // GPU layers makes the load fail rather than fall back.
    n_gpu_layers: 0,
    // Never mlock on Android: locking a multi-GB model in RAM pushes the phone into
    // swap/OOM and aborts the load. Let the kernel page it in and out instead.
    use_mlock: false,
  });

  // The projector is optional: text chat works without it, images need it.
  let vision = false;
  if (input.mmprojPath) {
    try {
      await context.initMultimodal({ path: toNativePath(input.mmprojPath), use_gpu: true });
      vision = (await context.getMultimodalSupport()).vision;
    } catch {
      vision = false;
    }
  }

  loaded = { modelId: input.modelId, context, vision };
  return loaded;
}

function collectMedia(attachments: ChatAttachment[] | undefined, vision: boolean) {
  const { imagePaths } = mediaUrisFor(attachments ?? []);
  if (!vision) return { mediaPaths: [] as string[], unusableImages: imagePaths.length };
  return { mediaPaths: imagePaths.map(toNativePath), unusableImages: 0 };
}

/** Append honest notes for attachments the runtime could not read, so replies never pretend. */
function withAttachmentNotes(prompt: string, unusableImages: number): string {
  const notes: string[] = [];
  if (unusableImages > 0) {
    notes.push(
      `${unusableImages} image attachment(s) could not be read because the vision projector is not installed on this device.`,
    );
  }
  return notes.length ? `${prompt}\n\nAttachment notes: ${notes.join(' ')}` : prompt;
}

/** Run one turn on the selected on-device model. Throws with an actionable message on failure. */
export async function generateBuddyReply(input: GenerateInput): Promise<string> {
  let active: { context: LlamaContext; vision: boolean };
  try {
    active = await ensureLoaded(input);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`${detail} Install the selected model file on this device and try again.`);
  }

  const { mediaPaths, unusableImages } = collectMedia(input.attachments, active.vision);
  const prompt = withAttachmentNotes(input.prompt, unusableImages);

  try {
    const result = await active.context.completion({
      messages: [{ role: 'user', content: prompt }],
      n_predict: 320,
      temperature: 0.4,
      top_p: 0.95,
      media_paths: mediaPaths.length ? mediaPaths : undefined,
    });
    const text = result.text.trim();
    if (!text) throw new Error('The on-device model returned an empty response.');
    return text;
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    // A failed context can be left unusable; drop it so the next try starts clean.
    await unloadBuddyModel();
    throw new Error(`${detail} Try sending again, or switch models.`);
  }
}

/** Test seam: whether the loaded context reported an image projector. */
export function loadedSupportsVision(): boolean {
  return Boolean(loaded?.vision);
}

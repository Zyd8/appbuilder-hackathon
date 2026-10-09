import type { ChatAttachment } from './types';

export type RuntimeStatus =
  | { state: 'idle' }
  | { state: 'loading'; modelId: string }
  | { state: 'generating'; modelId: string };

export type GenerateInput = {
  modelId: string;
  modelPath: string;
  prompt: string;
  attachments?: ChatAttachment[];
};

type LiteRtModule = typeof import('../../../modules/pocketops-litert-lm/src/PocketOpsLiteRTLMModule').default;

let loadedModelId: string | null = null;

/**
 * The native module only exists in a development/native build. Import it lazily so the shared
 * app (Expo Go, web) still boots and can report an honest "on-device model unavailable" state.
 */
async function liteRt(): Promise<LiteRtModule> {
  const imported = await import('../../../modules/pocketops-litert-lm/src/PocketOpsLiteRTLMModule');
  return imported.default;
}

/** LiteRT-LM expects a filesystem path, not a `file://` URI. */
function toNativePath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

export async function isOnDeviceRuntimeAvailable(): Promise<boolean> {
  try {
    await liteRt();
    return true;
  } catch {
    return false;
  }
}

export async function unloadBuddyModel(): Promise<void> {
  try {
    const module = await liteRt();
    await module.unload();
  } catch {
    // Nothing loaded in this runtime.
  } finally {
    loadedModelId = null;
  }
}

async function ensureModelLoaded(modelId: string, modelPath: string): Promise<LiteRtModule> {
  const module = await liteRt();
  if (loadedModelId === modelId && (await module.isLoaded())) return module;
  await unloadBuddyModel();
  await module.loadModel(toNativePath(modelPath));
  loadedModelId = modelId;
  return module;
}

/** Run one turn on the selected on-device model. Throws with an actionable message on failure. */
export async function generateBuddyReply(input: GenerateInput): Promise<string> {
  const module = await ensureModelLoaded(input.modelId, input.modelPath);
  const imagePaths: string[] = [];
  const audioPaths: string[] = [];
  for (const attachment of input.attachments ?? []) {
    if (attachment.status !== 'ready') continue;
    const path = toNativePath(attachment.uri);
    if (attachment.kind === 'image') imagePaths.push(path);
    if (attachment.kind === 'audio') audioPaths.push(path);
  }

  try {
    const text = await module.generate(input.prompt, imagePaths, audioPaths);
    const trimmed = text.trim();
    if (!trimmed) throw new Error('The on-device model returned an empty response.');
    return trimmed;
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`${detail} Check that the selected model file is installed on this device.`);
  }
}

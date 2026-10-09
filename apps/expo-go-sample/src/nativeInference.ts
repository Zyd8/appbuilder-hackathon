import type { SearchHit } from './retrieval';
import { ModelId } from './modelRegistry';

export type NativeQwenResult = {
  text: string;
  model: string;
  runtime: 'llama.rn';
};

export async function generateWithQwen(modelPath: string, question: string, sources: SearchHit[]): Promise<NativeQwenResult> {
  if (!modelPath.trim()) {
    throw new Error('Qwen model path is not configured. Install a Qwen3 GGUF file on the device first.');
  }

  // Dynamic import keeps the Expo Go UI/fallback preview from crashing at startup.
  const { initLlama } = await import('llama.rn');
  const context = await initLlama({
    model: modelPath,
    n_ctx: 2048,
    n_batch: 256,
    n_gpu_layers: 99,
    use_mlock: true,
  });

  try {
    const sourceText = sources.map((source) => `[${source.sectionId}] ${source.heading}: ${source.body}`).join('\n');
    const result = await context.completion({
      messages: [
        { role: 'system', content: 'You are PocketOps, an offline assistant. Answer only from the supplied local sources. If the sources are insufficient, say so. Keep the answer concise and cite source IDs.' },
        { role: 'user', content: `Question: ${question}\n\nLocal sources:\n${sourceText || '(no matching local sources)'}` },
      ],
      n_predict: 180,
      temperature: 0.2,
      top_p: 0.9,
      chat_template_kwargs: { enable_thinking: false },
    });
    return { text: result.text.trim(), model: 'Qwen3 1.7B GGUF', runtime: 'llama.rn' };
  } finally {
    await context.release();
  }
}

export async function generateWithSelectedModel(modelId: ModelId, modelPath: string, question: string, sources: SearchHit[]) {
  async function generateWithGemma(profileId: ModelId, modelPath: string, question: string, sources: SearchHit[]) {
    if (!modelPath.trim()) throw new Error('Gemma model path is not configured. Install the .litertlm model on the device first.');
    const { default: liteRt } = await import('../modules/pocketops-litert-lm/src/PocketOpsLiteRTLMModule');
    const sourceText = sources.map((source) => `[${source.sectionId}] ${source.heading}: ${source.body}`).join('\n');
    await liteRt.initialize(modelPath);
    try {
      const text = await liteRt.generate(`Answer only from these local sources. Question: ${question}\n\nSources:\n${sourceText || '(no matching local sources)'}`);
      return { text, model: profileId === 'gemma3n-e2b' ? 'Gemma 3n E2B' : 'Gemma 3n E4B', runtime: 'LiteRT-LM' as const };
    } finally {
      await liteRt.release();
    }
  }

  if (modelId === 'qwen3-1.7b') return generateWithQwen(modelPath, question, sources);
  return generateWithGemma(modelId, modelPath, question, sources);
}

import type { SearchHit } from './retrieval';

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

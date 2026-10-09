export type ModelId = 'qwen3-1.7b' | 'gemma3n-e2b' | 'gemma3n-e4b';

export type LocalModelProfile = {
  id: ModelId;
  label: string;
  runtime: string;
  available: boolean;
  description: string;
  modelPath: string;
};

export const MODEL_PROFILES: LocalModelProfile[] = [
  {
    id: 'qwen3-1.7b',
    label: 'Qwen3 1.7B',
    runtime: 'llama.rn',
    available: true,
    description: 'Working native GGUF model for Android/iOS development builds.',
    modelPath: 'file:///sdcard/Android/data/com.anonymous.pocketops/files/models/Qwen3-1.7B-Q8_0.gguf',
  },
  {
    id: 'gemma3n-e2b',
    label: 'Gemma 3n E2B',
    runtime: 'LiteRT-LM',
    available: true,
    description: 'Mobile-oriented LiteRT-LM model; requires the native adapter and a local .litertlm file.',
    modelPath: 'file:///sdcard/Android/data/com.anonymous.pocketops/files/models/Gemma3n-E2B-it.litertlm',
  },
  {
    id: 'gemma3n-e4b',
    label: 'Gemma 3n E4B',
    runtime: 'LiteRT-LM',
    available: true,
    description: 'Higher-quality LiteRT-LM model; requires the native adapter and a local .litertlm file.',
    modelPath: 'file:///sdcard/Android/data/com.anonymous.pocketops/files/models/Gemma3n-E4B-it.litertlm',
  },
];

export function getModelProfile(id: ModelId) {
  return MODEL_PROFILES.find((profile) => profile.id === id) ?? MODEL_PROFILES[0];
}

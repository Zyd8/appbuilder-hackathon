import { requireNativeModule } from 'expo-modules-core';

type PocketOpsLiteRTLMNativeModule = {
  initialize(modelPath: string): Promise<{ runtime: string; modelPath: string }>;
  generate(prompt: string): Promise<string>;
  release(): Promise<void>;
};

export default requireNativeModule<PocketOpsLiteRTLMNativeModule>('PocketOpsLiteRTLM');

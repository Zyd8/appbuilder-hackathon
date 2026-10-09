import { requireNativeModule } from 'expo-modules-core';

/** Native LiteRT-LM bridge shared by Android and iOS builds. */
export type PocketOpsLiteRTLMNativeModule = {
  isLoaded(): Promise<boolean>;
  loadModel(modelPath: string): Promise<{ runtime: string; backend: string }>;
  generate(prompt: string, imagePaths: string[], audioPaths: string[]): Promise<string>;
  unload(): Promise<boolean>;
};

export default requireNativeModule<PocketOpsLiteRTLMNativeModule>('PocketOpsLiteRTLM');

import type { ToolCall } from './tool-protocol';

export type AIEngineReadiness =
  | 'not-installed' | 'downloading' | 'verifying' | 'ready' | 'incompatible' | 'error';

export interface AIEngineCapabilities {
  text: true;
  vision: boolean;
  audio: false;
  functionCalling: boolean;
  contextTokens: number;
}

export type AIEngineOutput =
  | { kind: 'final'; text: string; toolCall?: never }
  | { kind: 'toolCall'; toolCall: ToolCall; text?: never };

export interface AIEngineRequest {
  prompt: string;
  maxOutputTokens: number;
  tools?: readonly {
    type: 'function';
    function: { name: string; description?: string; parameters: Record<string, unknown> };
  }[];
  toolChoice?: 'auto' | 'none' | 'required';
  /** App-resolved image input only. Never include a quest proof photo. */
  images?: readonly { uri: string; mimeType: string }[];
  signal?: AbortSignal;
}

export interface AIEngine {
  readiness(modelId: string): Promise<AIEngineReadiness>;
  initialize(modelId: string): Promise<AIEngineCapabilities>;
  generate(request: AIEngineRequest): Promise<AIEngineOutput>;
  cancel(): Promise<void>;
  dispose(): Promise<void>;
  capabilities(): AIEngineCapabilities | null;
}

import type { ToolResult } from './tool-protocol';

/** Only presentation-safe fields cross into chat UI. */
export interface NormalizedAssistantResponse {
  whatIChecked: string[];
  finalAnswer: string;
  toolResults: readonly ToolResult<unknown>[];
  state: 'complete' | 'stopped' | 'failed';
}

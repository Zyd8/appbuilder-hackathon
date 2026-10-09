import type { ToolResult } from './contracts/tool-protocol';
import type { NormalizedAssistantResponse } from './contracts/chat-output';
import { normalizeAssistantOutput, type NormalizedModelOutput } from './response-normalizer';

export interface ObservedAction { label: string; outcome: 'succeeded' | 'failed' | 'cancelled' }
export interface PresentedChat { summary: string[]; answer: string; state: 'complete' | 'stopped' | 'failed' }

export function presentChat(output: NormalizedModelOutput, actions: readonly ObservedAction[] = [], state: PresentedChat['state'] = 'complete'): PresentedChat {
  const summary = actions.map((action) => `${action.label}: ${action.outcome}.`);
  if (state === 'stopped') return { summary, answer: 'Stopped before Buddy finished.', state };
  if (state === 'failed' || !output.ok) return { summary, answer: 'Buddy could not produce a clean answer. Please try again.', state: 'failed' };
  return { summary, answer: output.answer, state: 'complete' };
}

export function presentAgentResponse(response: NormalizedAssistantResponse): PresentedChat {
  const actions: ObservedAction[] = response.toolResults.map((result: ToolResult<unknown>) => ({
    label: result.name, outcome: result.ok ? 'succeeded' : result.error.code === 'cancelled' ? 'cancelled' : 'failed',
  }));
  const normalized = normalizeAssistantOutput(response.finalAnswer);
  const presented = presentChat(normalized, actions, response.state);
  return { ...presented, summary: [...response.whatIChecked.filter((line) => !/<think>|"toolCall"/.test(line)).slice(0, 4), ...presented.summary].slice(0, 6) };
}

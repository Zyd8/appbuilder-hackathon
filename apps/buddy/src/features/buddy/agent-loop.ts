import type { AIEngine } from './contracts/ai-engine';
import type { ConfirmationDescriptor, ToolResult } from './contracts/tool-protocol';
import { ConfirmationController } from './tools/confirmation-controller';
import { ToolExecutor } from './tools/tool-executor';
import { modelToolDefinitions } from './tools/tool-registry';
import { parseModelEnvelope } from './tools/tool-schemas';

export type AgentTurnResult =
  | { state: 'complete'; finalText: string; toolResults: readonly ToolResult<unknown>[] }
  | { state: 'pending'; confirmation: ConfirmationDescriptor; toolResults: readonly ToolResult<unknown>[] }
  | { state: 'stopped'; reason: string; toolResults: readonly ToolResult<unknown>[] }
  | { state: 'failed'; error: string; toolResults: readonly ToolResult<unknown>[] };

const MAX_CALLS = 6;

/** A bounded, single-turn model/tool exchange. The model never executes a tool itself. */
export class AgentLoop {
  private prompt = '';
  private calls = 0;
  private results: ToolResult<unknown>[] = [];
  private active = false;

  constructor(private readonly engine: AIEngine, private readonly executor: ToolExecutor,
    private readonly confirmations: ConfirmationController) {}

  isActive(): boolean { return this.active; }

  async start(prompt: string, signal?: AbortSignal): Promise<AgentTurnResult> {
    if (this.active) return { state: 'failed', error: 'A turn is already active', toolResults: [...this.results] };
    this.active = true;
    this.prompt = prompt;
    this.calls = 0;
    this.results = [];
    return this.advance(signal);
  }

  async decide(callId: string, decision: 'confirm' | 'reject' | 'cancel', signal?: AbortSignal): Promise<AgentTurnResult> {
    const pending = this.confirmations.current();
    if (!this.active || !pending) return this.failed('No confirmation is pending');
    if (pending.call.id !== callId) return { state: 'pending', confirmation: pending.descriptor, toolResults: [...this.results] };
    const result = await this.confirmations.decide(callId, decision);
    this.addResult(result);
    if (decision !== 'confirm') {
      this.active = false;
      return { state: 'stopped', reason: decision === 'reject' ? 'You declined to save the note' : 'Note creation was cancelled',
        toolResults: [...this.results] };
    }
    if (!result.ok) return this.failed('The note could not be verified as saved');
    return this.advance(signal);
  }

  private addResult(result: ToolResult<unknown>): void {
    this.results.push(result);
    // Serialized data is bounded by tool-result.ts. Mark it as untrusted for prompt assembly.
    const encoded = JSON.stringify(result).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
    this.prompt += `\n<untrusted_tool_result>\n${encoded}\n</untrusted_tool_result>`;
  }

  private failed(error: string): AgentTurnResult {
    this.active = false;
    return { state: 'failed', error, toolResults: [...this.results] };
  }

  private async advance(signal?: AbortSignal): Promise<AgentTurnResult> {
    for (;;) {
      if (signal?.aborted) return this.failed('Turn was cancelled');
      let raw;
      try {
        raw = await this.engine.generate({ prompt: this.prompt, maxOutputTokens: 512,
          tools: modelToolDefinitions(), toolChoice: 'auto', signal });
      } catch { return this.failed('On-device model generation failed'); }
      const output = parseModelEnvelope(raw);
      if (!output) return this.failed('The model returned an invalid response');
      if (output.kind === 'final') {
        this.active = false;
        return { state: 'complete', finalText: output.text, toolResults: [...this.results] };
      }
      if (this.calls >= MAX_CALLS) return this.failed('Tool call limit reached');
      this.calls += 1;
      const execution = await this.executor.execute(output.toolCall);
      if (execution.kind === 'confirmation') {
        return { state: 'pending', confirmation: execution.pending.descriptor, toolResults: [...this.results] };
      }
      this.addResult(execution.result);
    }
  }
}

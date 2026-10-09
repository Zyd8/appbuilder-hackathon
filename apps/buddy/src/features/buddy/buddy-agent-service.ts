import type { AIEngine } from './contracts/ai-engine';
import type { BuddyAuditPort, BuddyClock, BuddyReadPorts, BuddyWritePorts } from './contracts/domain-ports';
import { AgentLoop, type AgentTurnResult } from './agent-loop';
import { ConfirmationController } from './tools/confirmation-controller';
import { NotesCreateHandler } from './tools/notes-create-handler';
import { ToolExecutor } from './tools/tool-executor';

/** Composes the app-owned execution boundary over injected model and Phase-2 ports. */
export class BuddyAgentService {
  private readonly loop: AgentLoop;

  constructor(private readonly engine: AIEngine, reads: BuddyReadPorts, writes: BuddyWritePorts,
    clock: BuddyClock, audit?: BuddyAuditPort) {
    const notes = new NotesCreateHandler(reads, writes, clock, audit);
    const confirmations = new ConfirmationController(notes, () => clock.now());
    const executor = new ToolExecutor(reads, notes, confirmations, () => clock.now());
    this.loop = new AgentLoop(engine, executor, confirmations);
  }

  async start(modelId: string, prompt: string, signal?: AbortSignal): Promise<AgentTurnResult> {
    if (this.loop.isActive()) return { state: 'failed', error: 'A turn is already active', toolResults: [] };
    try {
      if (await this.engine.readiness(modelId) !== 'ready')
        return { state: 'failed', error: 'The selected local model is unavailable', toolResults: [] };
      await this.engine.initialize(modelId);
    } catch {
      return { state: 'failed', error: 'The selected local model could not start', toolResults: [] };
    }
    return this.loop.start(prompt, signal);
  }

  decide(callId: string, decision: 'confirm' | 'reject' | 'cancel', signal?: AbortSignal): Promise<AgentTurnResult> {
    return this.loop.decide(callId, decision, signal);
  }
}

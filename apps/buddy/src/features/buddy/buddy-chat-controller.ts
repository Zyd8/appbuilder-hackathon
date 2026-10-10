import type { ChatMessage } from '@/domain/types';
import { CheckInRepository } from '@/lib/check-in-repository';
import { openBuddyDatabase, type BuddyDatabase } from '@/lib/buddy-database';
import { ProfileRepository } from '@/lib/profile-repository';
import { ProgressRepository } from '@/lib/progress-repository';
import { QuestRepository } from '@/lib/quest-repository';
import { accountNamespace } from '@/lib/repository-namespace';

import { BuddyAgentService } from './buddy-agent-service';
import { createBuddyReadPorts, createBuddyWritePorts } from './adapters/domain-adapters';
import { createRuntimeReadPorts } from './adapters/runtime-adapters';
import { presentAgentResponse } from './chat-presenter';
import type { AIEngine, AIEngineReadiness } from './contracts/ai-engine';
import type { ConfirmationDescriptor, ToolResult } from './contracts/tool-protocol';
import { LlamaRnGemmaEngine } from './llama-rn-gemma-engine';
import { ExpoMemoryFileAdapter, MemoryRepository } from './memory/memory-repository';
import { ModelManager } from './model-manager';
import { buildBuddyPrompt, type PromptTurn } from './prompt-builder';
import type { BuddyModelId } from './types';
import type { AgentTurnResult } from './agent-loop';

export type BuddyChatResult =
  | { state: 'pending'; confirmation: ConfirmationDescriptor; summary: string[] }
  | { state: 'complete' | 'stopped' | 'failed'; summary: string[]; answer: string; error?: string };

export interface BuddyChatStart {
  modelId: BuddyModelId;
  history: PromptTurn[];
  /** Optional app-observed context only. Model-visible tools reopen durable state themselves. */
  localContext?: string[];
  signal?: AbortSignal;
}

const TOOL_CONTRACT = 'Local read tools are available. notes.create requires explicit user confirmation and durable read-back. To create a note, first call notes.read for expectedRevision, then use a fresh idempotencyKey. Never claim a write before its confirmed result. Quest proof photos and their paths are unavailable to you.';

/** App-owned chat boundary. The UI receives only a confirmation or cleaned presentation fields. */
export class BuddyChatController {
  private readonly agent: BuddyAgentService;

  constructor(readonly memory: MemoryRepository, private readonly engine: AIEngine,
    reads: ConstructorParameters<typeof BuddyAgentService>[1],
    writes: ConstructorParameters<typeof BuddyAgentService>[2],
    private readonly db?: BuddyDatabase, private readonly manager?: ModelManager) {
    this.agent = new BuddyAgentService(engine, reads, writes, { now: () => new Date().toISOString() });
  }

  async start(input: BuddyChatStart): Promise<BuddyChatResult> {
    try {
      this.manager?.switchModel(input.modelId);
      const documents = await this.memory.readAll();
      const prompt = buildBuddyPrompt(input.history, input.localContext ?? [], {
        botMemory: documents.find((doc) => doc.name === 'BOT.md')?.text,
        userMemory: documents.find((doc) => doc.name === 'USER.md')?.text,
        toolContract: TOOL_CONTRACT,
        budget: { contextTokens: 4096, reserveOutputTokens: 2200 },
      });
      return this.present(await this.agent.start(input.modelId, prompt, input.signal));
    } catch {
      return { state: 'failed', summary: [], answer: 'Buddy could not prepare this local chat.',
        error: 'Buddy could not prepare this local chat.' };
    }
  }

  async decide(callId: string, decision: 'confirm' | 'reject' | 'cancel', signal?: AbortSignal): Promise<BuddyChatResult> {
    return this.present(await this.agent.decide(callId, decision, signal));
  }

  modelStatus(modelId: BuddyModelId): Promise<AIEngineReadiness> {
    this.manager?.switchModel(modelId);
    return this.engine.readiness(modelId);
  }

  /** 0..1 while a download runs, so the screen can show real progress instead of a spinner. */
  modelProgress(modelId: BuddyModelId): number | null {
    return this.manager?.progress(modelId) ?? null;
  }

  /** Model lifecycle is callable only from explicit app UI controls, never from a tool request. */
  installModel(modelId: BuddyModelId, includeProjector: boolean, confirmed: boolean): Promise<void> {
    if (!this.manager) return Promise.reject(new Error('Model manager is unavailable'));
    return this.manager.install(modelId, confirmed, includeProjector);
  }

  retryModel(modelId: BuddyModelId): void {
    if (!this.manager) throw new Error('Model manager is unavailable');
    this.manager.retry(modelId);
  }

  async deleteModel(modelId: BuddyModelId, confirmed: boolean): Promise<void> {
    if (!this.manager) return Promise.reject(new Error('Model manager is unavailable'));
    if (!confirmed) throw new Error('Model deletion requires confirmation');
    await this.engine.dispose();
    await this.manager.delete(modelId, true);
  }

  async close(): Promise<void> {
    await this.engine.dispose();
    await this.db?.closeAsync();
  }

  private present(result: AgentTurnResult): BuddyChatResult {
    const toolResults: readonly ToolResult<unknown>[] = result.toolResults;
    if (result.state === 'pending') return {
      state: 'pending', confirmation: result.confirmation,
      summary: toolResults.slice(-6).map((item) => item.ok ? `${item.name}: checked.` : `${item.name}: ${item.error.code}.`),
    };
    const finalAnswer = result.state === 'complete' ? result.finalText : '';
    const presented = presentAgentResponse({ whatIChecked: [], finalAnswer, toolResults, state: result.state });
    if (result.state === 'complete' && presented.state === 'failed') return {
      state: 'failed', summary: presented.summary, answer: presented.answer,
      error: 'Buddy returned an unreadable answer.',
    };
    return { state: result.state, summary: presented.summary,
      answer: result.state === 'complete' ? presented.answer : result.state === 'stopped' ? result.reason : result.error,
      ...(result.state === 'failed' ? { error: result.error } : {}) };
  }
}

const controllers = new Map<string, Promise<BuddyChatController>>();

/** Account-scoped session; reopening reads the latest SQLite and app-private memory state. */
export function getBuddyChatController(userId: string): Promise<BuddyChatController> {
  const namespace = accountNamespace(userId);
  const existing = controllers.get(namespace);
  if (existing) return existing;
  const pending = (async () => {
    const db = await openBuddyDatabase();
    const manager = new ModelManager();
    const engine = new LlamaRnGemmaEngine(manager);
    const memory = new MemoryRepository(new ExpoMemoryFileAdapter(), { kind: 'account', id: userId });
    const runtime = createRuntimeReadPorts(manager, engine, () => new Date().toISOString());
    const reads = createBuddyReadPorts({ namespace, profile: new ProfileRepository(db, namespace),
      quests: new QuestRepository(db, namespace), checkIn: new CheckInRepository(db, namespace),
      progress: new ProgressRepository(db, namespace), memory, ...runtime,
      now: () => new Date().toISOString() });
    return new BuddyChatController(memory, engine, reads, createBuddyWritePorts(namespace), db, manager);
  })();
  controllers.set(namespace, pending);
  void pending.catch(() => { if (controllers.get(namespace) === pending) controllers.delete(namespace); });
  return pending;
}

export async function releaseBuddyChatController(userId: string): Promise<void> {
  const namespace = accountNamespace(userId);
  const pending = controllers.get(namespace);
  controllers.delete(namespace);
  if (pending) {
    try { await (await pending).close(); }
    catch { /* A failed initialization owns no live chat session. */ }
  }
}

/** Narrow store mapping, so chat history never contains raw tool arguments. */
export function chatHistory(messages: readonly ChatMessage[]): PromptTurn[] {
  return messages.map((item) => ({ role: item.role, text: item.text, attachments: item.attachments }));
}

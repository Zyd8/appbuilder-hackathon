import type { Quest } from './types';
import { QUEST_LIBRARY } from '../data/quest-library';
import { grantXp } from './xp';
import { validateQuestCandidate, validateReroll, validateReword, type QuestBoundary } from './quest-policy';
import { ServiceError, assertLocalDate, assertTimestamp, requireCommandContext, type AtomicStore, type CommandContext, type CommandResult } from './service-types';

export interface QuestState {
  quests: Quest[];
  totalXp: number;
  earnedToday: number;
  xpDate: string;
  rerollsUsed: number;
  maxRerolls: number;
  completedIds: string[];
}
export interface ProofMetadata { proofId: string }
export interface QuestProofPort { verify(questId: string, proofId: string): Promise<boolean> }
export interface QuestCompletionEffect { quest: Quest; xpGranted: number; totalXp: number; proofId: string }

export class QuestService {
  constructor(private readonly store: AtomicStore<QuestState>, private readonly proof: QuestProofPort) {}

  async complete(context: CommandContext, input: { questId: string; proof: ProofMetadata; reflection?: string; now: string; localDate: string }): Promise<CommandResult<QuestCompletionEffect>> {
    requireCommandContext(context);
    assertTimestamp(input.now);
    assertLocalDate(input.localDate);
    if (Object.keys(input).some((key) => !['questId', 'proof', 'reflection', 'now', 'localDate'].includes(key))) {
      throw new ServiceError('invalid_arguments', 'Unknown completion field');
    }
    if (input.reflection !== undefined && (typeof input.reflection !== 'string' || input.reflection.length > 1000)) {
      throw new ServiceError('invalid_arguments', 'Invalid reflection');
    }
    // Only an app-owned opaque identifier crosses this boundary. Paths supplied by a model are rejected.
    if (!input.proof || Object.keys(input.proof).some((key) => key !== 'proofId') || !input.proof.proofId?.trim()) {
      throw new ServiceError('proof_required', 'App-owned photo proof is required');
    }
    if (!(await this.proof.verify(input.questId, input.proof.proofId))) throw new ServiceError('proof_required', 'Photo proof was not found');
    const fingerprint = JSON.stringify(['complete', input]);
    return this.store.transact(context, fingerprint, (state) => {
      const quest = state.quests.find((item) => item.id === input.questId);
      if (!quest) throw new ServiceError('not_found', 'Quest was not found');
      if (quest.status !== 'active') throw new ServiceError('invalid_transition', 'Only an active quest can be completed');
      if (state.completedIds.includes(quest.id)) throw new ServiceError('invalid_transition', 'Quest already completed');
      const template = QUEST_LIBRARY.find((item) => item.id === quest.templateId);
      if (template?.physical && state.quests.some((item) => item.id !== quest.id && item.status === 'done' && item.completedAt?.slice(0, 10) === input.localDate && QUEST_LIBRARY.some((entry) => entry.id === item.templateId && entry.physical))) {
        throw new ServiceError('daily_limit', 'Only one physical quest per day');
      }
      if (!Number.isSafeInteger(state.totalXp) || state.totalXp < 0 || !Number.isSafeInteger(state.earnedToday) || state.earnedToday < 0) {
        throw new ServiceError('storage_failure', 'Invalid stored XP state');
      }
      const earnedToday = state.xpDate === input.localDate ? state.earnedToday : 0;
      if (!Number.isSafeInteger(quest.xp) || quest.xp < 0) throw new ServiceError('storage_failure', 'Invalid quest XP');
      const xpGranted = grantXp(earnedToday, quest.xp);
      if (!Number.isSafeInteger(state.totalXp + xpGranted)) throw new ServiceError('storage_failure', 'XP total exceeds safe range');
      const completed: Quest = { ...quest, status: 'done', completedAt: input.now, reflection: input.reflection?.trim() || undefined };
      return {
        state: { ...state, quests: state.quests.map((item) => item.id === quest.id ? completed : item), completedIds: [...state.completedIds, quest.id], xpDate: input.localDate, earnedToday: earnedToday + xpGranted, totalXp: state.totalXp + xpGranted },
        value: { quest: completed, xpGranted, totalXp: state.totalXp + xpGranted, proofId: input.proof.proofId },
      };
    });
  }

  async skip(context: CommandContext, questId: string): Promise<CommandResult<Quest>> {
    requireCommandContext(context);
    return this.store.transact(context, JSON.stringify(['skip', questId]), (state) => {
      const quest = state.quests.find((item) => item.id === questId);
      if (!quest) throw new ServiceError('not_found', 'Quest was not found');
      if (quest.status !== 'offered' && quest.status !== 'active') throw new ServiceError('invalid_transition', 'Quest cannot be skipped');
      const skipped: Quest = { ...quest, status: 'skipped' };
      return { state: { ...state, quests: state.quests.map((item) => item.id === questId ? skipped : item) }, value: skipped };
    });
  }

  async reword(context: CommandContext, questId: string, title: string, instruction: string): Promise<CommandResult<Quest>> {
    requireCommandContext(context);
    return this.store.transact(context, JSON.stringify(['reword', questId, title, instruction]), (state) => {
      const quest = state.quests.find((item) => item.id === questId);
      if (!quest) throw new ServiceError('not_found', 'Quest was not found');
      validateReword(quest, title, instruction);
      const updated = { ...quest, title: title.trim(), instruction: instruction.trim() };
      return { state: { ...state, quests: state.quests.map((item) => item.id === questId ? updated : item) }, value: updated };
    });
  }

  async reroll(context: CommandContext, questId: string, replacement: Quest, boundary: QuestBoundary): Promise<CommandResult<Quest>> {
    requireCommandContext(context);
    return this.store.transact(context, JSON.stringify(['reroll', questId, replacement, boundary]), (state) => {
      const quest = state.quests.find((item) => item.id === questId);
      if (!quest) throw new ServiceError('not_found', 'Quest was not found');
      validateReroll(quest, state.rerollsUsed, state.maxRerolls);
      if (state.quests.some((item) => item.id === replacement.id)) throw new ServiceError('invalid_arguments', 'Replacement ID already exists');
      if (replacement.status !== 'offered' || replacement.offeredOn !== boundary.date) throw new ServiceError('invalid_arguments', 'Invalid replacement state');
      const template = QUEST_LIBRARY.find((item) => item.id === replacement.templateId);
      if (!template) throw new ServiceError('invalid_arguments', 'Reroll replacement must be a curated template');
      validateQuestCandidate(template, boundary);
      if (replacement.title !== template.title || replacement.instruction !== template.instruction || replacement.rank !== template.rank || replacement.area !== template.area) {
        throw new ServiceError('invalid_arguments', 'Replacement differs from curated template');
      }
      const old = { ...quest, status: 'rerolled' as const };
      return { state: { ...state, quests: [...state.quests.map((item) => item.id === questId ? old : item), replacement], rerollsUsed: state.rerollsUsed + 1 }, value: replacement };
    });
  }
}

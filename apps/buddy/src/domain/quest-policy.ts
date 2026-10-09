import { QUEST_LIBRARY } from '../data/quest-library';
import type { Energy, Quest, QuestRank, QuestTemplate } from './types';
import { ServiceError, assertLocalDate } from './service-types';

const RANK_ORDER: QuestRank[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const ENERGY_ORDER: Energy[] = ['low', 'medium', 'high'];
const UNSAFE = /\b(?:starv(?:e|ation)|self.harm|hurt yourself|dangerous|illegal|gambl|buy now|spend money|contact strangers?)\b/i;

export interface QuestBoundary {
  date: string;
  maxRank: QuestRank;
  energy: Energy;
  physicalCompletedToday: boolean;
  excludedTemplateIds?: readonly string[];
}

export function validateQuestText(title: string, instruction: string): void {
  if (!title.trim() || title.length > 100 || !instruction.trim() || instruction.length > 500 || UNSAFE.test(`${title} ${instruction}`)) {
    throw new ServiceError('boundary_violation', 'Quest wording is outside safe limits');
  }
}

export function validateQuestCandidate(candidate: QuestTemplate, boundary: QuestBoundary): void {
  assertLocalDate(boundary.date);
  validateQuestText(candidate.title, candidate.instruction);
  if (!Number.isFinite(candidate.estMinutes) || candidate.estMinutes < 1 || candidate.estMinutes > 120) {
    throw new ServiceError('boundary_violation', 'Quest duration is outside safe limits');
  }
  if (RANK_ORDER.indexOf(candidate.rank) < 0 || RANK_ORDER.indexOf(candidate.rank) > RANK_ORDER.indexOf(boundary.maxRank)) {
    throw new ServiceError('boundary_violation', 'Quest rank exceeds player boundary');
  }
  if (ENERGY_ORDER.indexOf(candidate.energy) < 0 || ENERGY_ORDER.indexOf(candidate.energy) > ENERGY_ORDER.indexOf(boundary.energy)) {
    throw new ServiceError('boundary_violation', 'Quest exceeds available energy');
  }
  if (candidate.physical && boundary.physicalCompletedToday) throw new ServiceError('daily_limit', 'Only one physical quest per day');
  if (boundary.excludedTemplateIds?.includes(candidate.id)) throw new ServiceError('invalid_transition', 'Quest already used');
}

export function questCandidates(boundary: QuestBoundary, library: readonly QuestTemplate[] = QUEST_LIBRARY): QuestTemplate[] {
  return library.filter((candidate) => {
    try { validateQuestCandidate(candidate, boundary); return true; } catch { return false; }
  });
}

export function validateReword(quest: Quest, title: string, instruction: string): void {
  if (quest.status !== 'offered' && quest.status !== 'active') throw new ServiceError('invalid_transition', 'Quest cannot be reworded');
  validateQuestText(title, instruction);
}

export function validateReroll(quest: Quest, rerollsUsed: number, maxRerolls: number): void {
  if (quest.status !== 'offered' && quest.status !== 'active') throw new ServiceError('invalid_transition', 'Quest cannot be rerolled');
  if (!Number.isInteger(rerollsUsed) || !Number.isInteger(maxRerolls) || rerollsUsed < 0 || maxRerolls < 0) throw new ServiceError('invalid_arguments', 'Invalid reroll count');
  if (rerollsUsed >= maxRerolls) throw new ServiceError('daily_limit', 'No rerolls remaining');
}

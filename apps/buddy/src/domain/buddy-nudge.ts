/**
 * Picks what Buddy says in the Today banner. Pure and deterministic: same inputs, same nudge,
 * so it works offline and never needs a model. The UI turns the result into copy.
 */
import { LIFE_AREAS, type CheckIn, type LifeArea, type OnboardingAnswer, type Quest } from './types';

export type BuddyNudge =
  | { kind: 'allDone' }
  | { kind: 'lowEnergy'; goal?: LifeArea }
  | { kind: 'goalQuest'; goal: LifeArea; questTitle: string; minutes: number }
  | { kind: 'goal'; goal: LifeArea }
  | { kind: 'general' };

export interface BuddyNudgeInput {
  answers: Record<string, OnboardingAnswer>;
  quests: Quest[];
  checkIn?: CheckIn;
  /** Day number used to rotate between goals. Pass a stable value per calendar day. */
  day: number;
}

/** The areas the player picked under "I want more…", in the order they chose them. */
export function goalsFromAnswers(answers: Record<string, OnboardingAnswer>): LifeArea[] {
  const raw = answers['goals.more'];
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is LifeArea => (LIFE_AREAS as readonly string[]).includes(value));
}

/** First word of a display name, or undefined when there is nothing usable. */
export function firstName(displayName: string | null | undefined): string | undefined {
  const first = displayName?.trim().split(/\s+/)[0];
  return first ? first : undefined;
}

export function pickBuddyNudge({ answers, quests, checkIn, day }: BuddyNudgeInput): BuddyNudge {
  if (quests.length > 0 && quests.every((q) => q.status === 'done')) return { kind: 'allDone' };

  const goals = goalsFromAnswers(answers);
  const goal = goals.length > 0 ? goals[Math.abs(day) % goals.length] : undefined;

  if (checkIn?.energy === 'low') return { kind: 'lowEnergy', goal };
  if (!goal) return { kind: 'general' };

  const open = quests.filter((q) => q.status === 'offered' || q.status === 'active');
  const match = open.find((q) => q.area === goal) ?? open.find((q) => goals.includes(q.area));
  if (match) return { kind: 'goalQuest', goal: match.area, questTitle: match.title, minutes: match.estMinutes };
  return { kind: 'goal', goal };
}

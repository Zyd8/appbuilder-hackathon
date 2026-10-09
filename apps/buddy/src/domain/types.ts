export const LIFE_AREAS = [
  'focus',
  'creativity',
  'knowledge',
  'social',
  'finance',
  'calm',
  'health',
  'organization',
] as const;

export type LifeArea = (typeof LIFE_AREAS)[number];

export const QUEST_RANKS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type QuestRank = (typeof QUEST_RANKS)[number];

export type Energy = 'low' | 'medium' | 'high';
export type Mood = 1 | 2 | 3 | 4 | 5;

export type QuestKind = 'daily' | 'weekly' | 'side';
export type QuestSource = 'library' | 'ai' | 'user';
export type QuestStatus = 'offered' | 'active' | 'done' | 'skipped' | 'rerolled';

export interface QuestTemplate {
  id: string;
  area: LifeArea;
  title: string;
  /** Short, story-flavored description. */
  flavor: string;
  /** Real-world instruction. */
  instruction: string;
  rank: QuestRank;
  estMinutes: number;
  energy: Energy;
  physical?: boolean;
  tags?: string[];
}

export interface Quest {
  id: string;
  templateId?: string;
  source: QuestSource;
  kind: QuestKind;
  area: LifeArea;
  title: string;
  flavor: string;
  instruction: string;
  rank: QuestRank;
  xp: number;
  estMinutes: number;
  why?: string;
  status: QuestStatus;
  offeredOn: string;
  completedAt?: string;
  reflection?: string;
}

export type StatBlock = Record<LifeArea, number>;

export interface Insight {
  id: string;
  type: 'strength' | 'growth_area' | 'focus';
  text: string;
  reason: string;
}

export interface PlayerProfile {
  displayName: string;
  title: string;
  totalXp: number;
  streakDays: number;
  restTokens: number;
  stats: StatBlock;
  insights: Insight[];
}

export interface Task {
  id: string;
  title: string;
  due?: string;
  priority: 'low' | 'normal' | 'high';
  area?: LifeArea;
  done: boolean;
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'buddy';
  text: string;
  /** Local context Buddy used to answer, shown to the user. */
  contextUsed?: string[];
  createdAt: string;
}

export interface CheckIn {
  date: string;
  mood: Mood;
  energy: Energy;
  focusText?: string;
}

export type OnboardingQuestion =
  | { id: string; section: string; kind: 'single'; prompt: string; options: QuestionOption[] }
  | { id: string; section: string; kind: 'multi'; prompt: string; options: QuestionOption[]; max: number }
  | { id: string; section: string; kind: 'scale'; prompt: string; area: LifeArea }
  | { id: string; section: string; kind: 'text'; prompt: string; placeholder: string };

export interface QuestionOption {
  value: string;
  label: string;
}

export type OnboardingAnswer = string | string[] | number;

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

export const NOTE_PRIORITIES = ['low', 'normal', 'high'] as const;

/** One item type for everything the player writes down: a thought, a to-do, or both (ADR-007, ADR-008). */
export interface Note {
  /** UUID, also the primary key of the cloud row. */
  id: string;
  body: string;
  createdAt: string;
  /** Bumped on every change; decides which copy wins when syncing. */
  updatedAt: string;
  /** Every note can be checked off. */
  done: boolean;
  priority: (typeof NOTE_PRIORITIES)[number];
  /** Optional scheduled local date (YYYY-MM-DD). Shows on Today on that day and in the calendar. */
  date?: string;
  area?: LifeArea;
  /** Manual list order (ADR-011): lower sorts first. Unset means `-createdAt` in ms, i.e. newest first. */
  position?: number;
  /** Soft delete, kept until the deletion reaches the cloud. */
  deletedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'buddy';
  text: string;
  /** Local context Buddy used to answer, shown to the user. */
  contextUsed?: string[];
  attachments?: import('@/features/buddy/types').ChatAttachment[];
  modelId?: import('@/features/buddy/types').BuddyModelId;
  generationState?: 'complete' | 'stopped' | 'failed';
  createdAt: string;
}

export interface CheckIn {
  date: string;
  mood: Mood;
  energy: Energy;
  focusText?: string;
}

export type OnboardingQuestion =
  | { id: string; kind: 'single'; prompt: string; options: QuestionOption[] }
  | { id: string; kind: 'multi'; prompt: string; options: QuestionOption[]; max: number }
  | { id: string; kind: 'scale'; prompt: string; area: LifeArea }
  | { id: string; kind: 'text'; prompt: string; placeholder: string };

export interface OnboardingPage {
  id: string;
  title: string;
  subtitle: string;
  /** What Buddy says at the top of the page. */
  buddyLine: string;
  questions: OnboardingQuestion[];
}

export interface QuestionOption {
  value: string;
  label: string;
}

export type OnboardingAnswer = string | string[] | number;

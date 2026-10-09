import type { QuestRank } from './types';

/** XP per quest rank (overview section 9). */
export const RANK_XP: Record<QuestRank, number> = {
  E: 10,
  D: 20,
  C: 35,
  B: 55,
  A: 80,
  S: 120,
};

export const DAILY_XP_CAP = 200;

/** XP needed to go from `level` to `level + 1`. Early levels come fast, later ones take weeks. */
export function xpToNextLevel(level: number): number {
  if (level < 1) throw new RangeError('level must be >= 1');
  return Math.round(50 * Math.pow(level, 1.5));
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  /** 0..1 */
  progress: number;
}

export function levelFromTotalXp(totalXp: number): LevelProgress {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level += 1;
  }
  const xpForNext = xpToNextLevel(level);
  return { level, xpIntoLevel: remaining, xpForNext, progress: remaining / xpForNext };
}

/** XP actually granted for a quest after the daily cap. Never negative: XP is never removed. */
export function grantXp(earnedToday: number, questXp: number): number {
  const room = Math.max(0, DAILY_XP_CAP - Math.max(0, earnedToday));
  return Math.min(Math.max(0, questXp), room);
}

export type BambotStage = 1 | 2 | 3;

/** Bambot grows up with the player: more XP (level) means a more mature form. */
export function bambotStage(level: number): BambotStage {
  if (level >= 10) return 3;
  if (level >= 5) return 2;
  return 1;
}

const RANK_BRACKETS: { minLevel: number; rank: QuestRank; title: string }[] = [
  { minLevel: 50, rank: 'S', title: 'S-Rank Legend' },
  { minLevel: 35, rank: 'A', title: 'A-Rank Trailblazer' },
  { minLevel: 20, rank: 'B', title: 'B-Rank Pathfinder' },
  { minLevel: 10, rank: 'C', title: 'C-Rank Adventurer' },
  { minLevel: 5, rank: 'D', title: 'D-Rank Explorer' },
  { minLevel: 1, rank: 'E', title: 'E-Rank Beginner' },
];

export function playerRank(level: number): { rank: QuestRank; title: string } {
  const bracket = RANK_BRACKETS.find((b) => level >= b.minLevel) ?? RANK_BRACKETS[RANK_BRACKETS.length - 1];
  return { rank: bracket.rank, title: bracket.title };
}

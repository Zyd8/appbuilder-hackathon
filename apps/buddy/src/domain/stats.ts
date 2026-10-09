import { LIFE_AREAS, type LifeArea, type StatBlock } from './types';

/** Plain-language band for a 0–100 stat. Encouraging on purpose: low is "building", never "weak". */
export type StatTier = 'strong' | 'steady' | 'building';

export function statTier(value: number): StatTier {
  if (value >= 65) return 'strong';
  if (value >= 45) return 'steady';
  return 'building';
}

export interface RankedStat {
  area: LifeArea;
  value: number;
  tier: StatTier;
}

export interface StatSummary {
  /** Rounded mean of all life areas, 0–100. */
  average: number;
  /** Highest first. Ties keep the `LIFE_AREAS` order so the list never reshuffles between renders. */
  ranked: RankedStat[];
  top: RankedStat;
  lowest: RankedStat;
}

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export function summarizeStats(stats: StatBlock): StatSummary {
  const ranked = LIFE_AREAS.map((area, index) => ({ area, value: clamp(stats[area]), index }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map(({ area, value }) => ({ area, value, tier: statTier(value) }));
  const average = Math.round(ranked.reduce((sum, s) => sum + s.value, 0) / ranked.length);
  return { average, ranked, top: ranked[0], lowest: ranked[ranked.length - 1] };
}

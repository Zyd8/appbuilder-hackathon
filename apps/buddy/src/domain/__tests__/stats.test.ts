/// <reference types="jest" />
import { statTier, summarizeStats } from '../stats';
import type { StatBlock } from '../types';

const STATS: StatBlock = {
  focus: 34,
  creativity: 68,
  knowledge: 61,
  social: 47,
  finance: 39,
  calm: 42,
  health: 55,
  organization: 37,
};

describe('statTier', () => {
  it('bands values into strong, steady, and building', () => {
    expect(statTier(100)).toBe('strong');
    expect(statTier(65)).toBe('strong');
    expect(statTier(64)).toBe('steady');
    expect(statTier(45)).toBe('steady');
    expect(statTier(44)).toBe('building');
    expect(statTier(0)).toBe('building');
  });
});

describe('summarizeStats', () => {
  it('ranks areas highest first and picks top and lowest', () => {
    const summary = summarizeStats(STATS);
    expect(summary.ranked.map((s) => s.area)).toEqual([
      'creativity',
      'knowledge',
      'health',
      'social',
      'calm',
      'finance',
      'organization',
      'focus',
    ]);
    expect(summary.top).toEqual({ area: 'creativity', value: 68, tier: 'strong' });
    expect(summary.lowest).toEqual({ area: 'focus', value: 34, tier: 'building' });
    expect(summary.average).toBe(48);
  });

  it('keeps life-area order for ties', () => {
    const flat = { ...STATS, focus: 50, creativity: 50, knowledge: 50, social: 50, finance: 50, calm: 50, health: 50, organization: 50 };
    expect(summarizeStats(flat).ranked.map((s) => s.area)).toEqual([
      'focus',
      'creativity',
      'knowledge',
      'social',
      'finance',
      'calm',
      'health',
      'organization',
    ]);
  });

  it('clamps out-of-range values to 0–100', () => {
    const summary = summarizeStats({ ...STATS, creativity: 140, focus: -5 });
    expect(summary.top.value).toBe(100);
    expect(summary.lowest.value).toBe(0);
  });
});

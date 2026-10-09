/// <reference types="jest" />
import { emptyAssessment, markCompleted, setAnswer } from '../assessment';
import { analyzeProfile } from '../profile-analysis';
import { LIFE_AREAS } from '../types';

const NOW = '2026-10-10T10:00:00.000Z';

describe('deterministic profile analysis', () => {
  it('maps all eight ratings, keeps Insight 1/2 ordered, and records evidence', () => {
    let doc = emptyAssessment('u1', NOW);
    LIFE_AREAS.forEach((area, index) => { doc = setAnswer(doc, `rate.${area}`, index % 5 + 1, NOW); });
    doc = setAnswer(doc, 'goals.more', ['finance', 'calm'], NOW);
    doc = markCompleted(doc, NOW);
    const result = analyzeProfile(doc);
    expect(LIFE_AREAS.map((area) => result.stats[area])).toEqual([20, 40, 60, 80, 100, 20, 40, 60]);
    expect(result.insights.map((item) => item.id)).toEqual(['insight-1', 'insight-2']);
    expect(result.insights[0].type).toBe('strength');
    expect(result.insights[1].type).toBe('growth_area');
    expect(result.insights[1].evidenceRefs).toContain('goals.more');
    expect(result.evidenceRefs).toHaveLength(9);
    expect(analyzeProfile(doc)).toEqual(result);
  });

  it('uses neutral defaults for missing, stale, invalid, and incompatible answers', () => {
    let doc = markCompleted(emptyAssessment('u1', NOW), NOW);
    doc = setAnswer(doc, 'rate.focus', 4, '2026-10-11T10:00:00.000Z');
    doc = { ...doc, updatedAt: NOW };
    expect(analyzeProfile(doc).stats.focus).toBe(50);
    expect(analyzeProfile(doc).warnings).toContain('missing_or_invalid:rate.focus');
    expect(analyzeProfile({ ...doc, questionnaireVersion: 99 }).warnings).toContain('assessment_version_mismatch');
    expect(analyzeProfile({ ...doc, completedAt: null }).warnings).toContain('assessment_incomplete');
  });
});

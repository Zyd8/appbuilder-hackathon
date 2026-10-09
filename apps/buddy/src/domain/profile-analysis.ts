import { ASSESSMENT_SCHEMA_VERSION, QUESTIONNAIRE_VERSION, type AssessmentDoc } from './assessment';
import { LIFE_AREAS, type LifeArea, type ProfileAnalysis, type StatBlock } from './types';

export const PROFILE_ANALYSIS_VERSION = 1;
const STAT_FROM_RATING = [0, 20, 40, 60, 80, 100] as const;

/** Fixed FNV-1a digest for a compact, deterministic local analysis revision. */
function digest(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Missing ratings are neutral, and invalid/stale answers never influence the result. */
export function analyzeProfile(doc: AssessmentDoc): ProfileAnalysis {
  const warnings: string[] = [];
  if (doc.schemaVersion !== ASSESSMENT_SCHEMA_VERSION || doc.questionnaireVersion !== QUESTIONNAIRE_VERSION) {
    warnings.push('assessment_version_mismatch');
  }
  if (!doc.completedAt) warnings.push('assessment_incomplete');
  const compatible = warnings.length === 0;
  const valid = (id: string) => {
    const answer = compatible ? doc.answers[id] : undefined;
    if (!answer || !Number.isFinite(Date.parse(answer.answeredAt)) ||
        Date.parse(answer.answeredAt) > Date.parse(doc.updatedAt)) return undefined;
    return answer.value;
  };
  const stats = {} as StatBlock;
  const evidenceRefs: string[] = [];
  for (const area of LIFE_AREAS) {
    const id = `rate.${area}`;
    const value = valid(id);
    if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) {
      stats[area] = STAT_FROM_RATING[value];
      evidenceRefs.push(id);
    } else {
      stats[area] = 50;
      warnings.push(`missing_or_invalid:${id}`);
    }
  }
  const goalsValue = valid('goals.more');
  const goals = Array.isArray(goalsValue)
    ? goalsValue.filter((value): value is LifeArea => typeof value === 'string' && LIFE_AREAS.includes(value as LifeArea)).slice(0, 3)
    : [];
  if (goals.length) evidenceRefs.push('goals.more');
  const ranked = LIFE_AREAS.map((area, index) => ({ area, index, score: stats[area] }));
  const strongest = [...ranked].sort((a, b) => b.score - a.score || a.index - b.index)[0].area;
  const weakest = [...ranked].sort((a, b) => a.score - b.score || a.index - b.index)[0].area;
  const focusArea = goals.find((area) => stats[area] <= 60) ?? weakest;
  const source = (area: LifeArea) => evidenceRefs.includes(`rate.${area}`) ? [`rate.${area}`] : [];
  const strongestIsRated = source(strongest).length > 0;
  const focusIsRated = source(focusArea).length > 0;
  const insights: ProfileAnalysis['insights'] = [
    { id: 'insight-1', type: 'strength', text: strongestIsRated ? `${strongest} is a starting strength` : `Start with ${strongest}`,
      reason: strongestIsRated ? `Your ${strongest} rating gives us a place to build from.` : 'Add ratings to personalize this insight.',
      evidenceRefs: source(strongest),
      provenance: 'assessment', analysisVersion: PROFILE_ANALYSIS_VERSION },
    { id: 'insight-2', type: 'growth_area', text: `Grow ${focusArea} in small steps`,
      reason: goals.includes(focusArea) ? `You chose ${focusArea} as a goal.` :
        focusIsRated ? `Your ${focusArea} rating suggests room to grow.` : 'Add ratings to personalize this focus.',
      evidenceRefs: goals.includes(focusArea) ? [...source(focusArea), 'goals.more'] : source(focusArea),
      provenance: 'assessment', analysisVersion: PROFILE_ANALYSIS_VERSION },
  ];
  const revisionInput = JSON.stringify([PROFILE_ANALYSIS_VERSION, doc.schemaVersion, doc.questionnaireVersion,
    doc.updatedAt, doc.completedAt, LIFE_AREAS.map((area) => stats[area]), goals]);
  return { analysisVersion: PROFILE_ANALYSIS_VERSION, revision: `pa1-${digest(revisionInput)}`,
    assessmentUpdatedAt: doc.updatedAt, stats, insights, focusArea,
    title: `The ${strongest[0].toUpperCase()}${strongest.slice(1)} Builder`, evidenceRefs, warnings };
}

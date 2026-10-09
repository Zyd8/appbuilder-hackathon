/**
 * On-device copy of the onboarding answers (localStorage backed by expo-sqlite), one document per user.
 * This copy is the source of truth; the cloud row is a backup (ADR-006).
 */
import 'expo-sqlite/localStorage/install';

import {
  ASSESSMENT_SCHEMA_VERSION,
  QUESTIONNAIRE_VERSION,
  sanitizeAnswers,
  type AssessmentDoc,
} from '@/domain/assessment';

const keyFor = (userId: string) => `buddy.onboarding.${userId}`;

const isStringOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string';

export function loadAssessment(userId: string): AssessmentDoc | undefined {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<AssessmentDoc>;
    if (parsed.userId !== userId || typeof parsed.updatedAt !== 'string') return undefined;
    return {
      schemaVersion: ASSESSMENT_SCHEMA_VERSION,
      questionnaireVersion:
        typeof parsed.questionnaireVersion === 'number' ? parsed.questionnaireVersion : QUESTIONNAIRE_VERSION,
      userId,
      answers: sanitizeAnswers(parsed.answers),
      completedAt: isStringOrNull(parsed.completedAt) ? parsed.completedAt : null,
      updatedAt: parsed.updatedAt,
      syncedAt: isStringOrNull(parsed.syncedAt) ? parsed.syncedAt : null,
    };
  } catch {
    return undefined;
  }
}

export function writeAssessment(doc: AssessmentDoc): void {
  localStorage.setItem(keyFor(doc.userId), JSON.stringify(doc));
}

/**
 * Onboarding answers as a versioned document (ADR-006). Pure rules only; storage and Supabase live in `src/lib`.
 * Stores raw option values, never display labels, so wording changes never invalidate saved answers.
 */
import type { OnboardingAnswer, OnboardingPage } from './types';

export const ASSESSMENT_SCHEMA_VERSION = 1;
/** Bump when questions are added, removed, or change meaning. */
export const QUESTIONNAIRE_VERSION = 1;

export interface StoredAnswer {
  value: OnboardingAnswer;
  answeredAt: string;
}

export interface AssessmentDoc {
  schemaVersion: number;
  questionnaireVersion: number;
  userId: string;
  answers: Record<string, StoredAnswer>;
  completedAt: string | null;
  updatedAt: string;
  /** The `updatedAt` that last reached the cloud. Differs from `updatedAt` while a sync is pending. */
  syncedAt: string | null;
}

export function emptyAssessment(userId: string, now: string): AssessmentDoc {
  return {
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    userId,
    answers: {},
    completedAt: null,
    updatedAt: now,
    syncedAt: null,
  };
}

/** Set or (with `undefined`) clear one answer. */
export function setAnswer(
  doc: AssessmentDoc,
  questionId: string,
  value: OnboardingAnswer | undefined,
  now: string,
): AssessmentDoc {
  const answers = { ...doc.answers };
  if (value === undefined) delete answers[questionId];
  else answers[questionId] = { value, answeredAt: now };
  return { ...doc, answers, updatedAt: now };
}

export function markCompleted(doc: AssessmentDoc, now: string): AssessmentDoc {
  return { ...doc, completedAt: now, updatedAt: now };
}

/** Start over: no answers, not completed. Still syncs so other devices see the reset. */
export function resetAssessment(doc: AssessmentDoc, now: string): AssessmentDoc {
  return { ...doc, answers: {}, completedAt: null, updatedAt: now };
}

export function needsSync(doc: AssessmentDoc): boolean {
  return doc.syncedAt !== doc.updatedAt;
}

/** Plain `{ questionId: value }` map for the UI. */
export function answerValues(doc: AssessmentDoc | undefined): Record<string, OnboardingAnswer> {
  const out: Record<string, OnboardingAnswer> = {};
  if (!doc) return out;
  for (const [id, stored] of Object.entries(doc.answers)) out[id] = stored.value;
  return out;
}

export interface AssessmentRow {
  user_id: string;
  answers: Record<string, StoredAnswer>;
  questionnaire_version: number;
  completed_at: string | null;
  updated_at: string;
}

export function toAssessmentRow(doc: AssessmentDoc): AssessmentRow {
  return {
    user_id: doc.userId,
    answers: doc.answers,
    questionnaire_version: doc.questionnaireVersion,
    completed_at: doc.completedAt,
    updated_at: doc.updatedAt,
  };
}

function isAnswerValue(value: unknown): value is OnboardingAnswer {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value)) ||
    (Array.isArray(value) && value.every((v) => typeof v === 'string'))
  );
}

/** Parse a stored document or cloud row. Untrusted input: drop anything that is not a valid answer. */
export function sanitizeAnswers(raw: unknown): Record<string, StoredAnswer> {
  const out: Record<string, StoredAnswer> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const { value, answeredAt } = entry as Record<string, unknown>;
    if (!isAnswerValue(value) || typeof answeredAt !== 'string') continue;
    out[id] = { value, answeredAt };
  }
  return out;
}

export function fromAssessmentRow(row: AssessmentRow): AssessmentDoc {
  return {
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    questionnaireVersion: row.questionnaire_version,
    userId: row.user_id,
    answers: sanitizeAnswers(row.answers),
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    syncedAt: row.updated_at,
  };
}

/**
 * Decide which copy to keep after pulling from the cloud.
 * Unsynced local edits always win (they get pushed next); otherwise the newer copy wins.
 */
export function pickRestore(
  local: AssessmentDoc | undefined,
  remote: AssessmentDoc | undefined,
): AssessmentDoc | undefined {
  if (!remote) return local;
  if (!local) return remote;
  if (needsSync(local)) return local;
  return Date.parse(remote.updatedAt) > Date.parse(local.updatedAt) ? remote : local;
}

export interface AssessmentSyncPorts {
  upsertRemote: (doc: AssessmentDoc) => Promise<void>;
  /** The newest local copy; edits may have landed while the upsert was in flight. */
  readLatest: () => AssessmentDoc | undefined;
  writeLocal: (doc: AssessmentDoc) => void;
}

/**
 * Push the local document (already saved on the device) to the cloud.
 * Marks only the pushed version as synced, so edits made during the upsert stay pending.
 */
export async function syncAssessmentLocalFirst(
  doc: AssessmentDoc,
  ports: AssessmentSyncPorts,
): Promise<{ doc: AssessmentDoc; synced: boolean }> {
  if (!needsSync(doc)) return { doc, synced: true };
  try {
    await ports.upsertRemote(doc);
  } catch {
    return { doc, synced: false };
  }
  const latest = ports.readLatest();
  const base = latest && latest.userId === doc.userId ? latest : doc;
  const updated: AssessmentDoc = { ...base, syncedAt: doc.updatedAt };
  ports.writeLocal(updated);
  return { doc: updated, synced: true };
}

export interface AssessmentContextEntry {
  id: string;
  section: string;
  question: string;
  answer: string | string[] | number;
  scale?: string;
}

const SCALE_HINT = '1 = needs work, 5 = going great';

/**
 * AI-ready view of the answers: labels instead of codes, in questionnaire order.
 * Answers to questions that no longer exist are dropped.
 */
export function buildAssessmentContext(
  doc: AssessmentDoc | undefined,
  pages: OnboardingPage[],
): AssessmentContextEntry[] {
  if (!doc) return [];
  const entries: AssessmentContextEntry[] = [];
  for (const page of pages) {
    for (const question of page.questions) {
      const stored = doc.answers[question.id];
      if (!stored) continue;
      const base = { id: question.id, section: page.title, question: question.prompt };
      const value = stored.value;
      switch (question.kind) {
        case 'single': {
          if (typeof value !== 'string') continue;
          const label = question.options.find((o) => o.value === value)?.label ?? value;
          entries.push({ ...base, answer: label });
          break;
        }
        case 'multi': {
          if (!Array.isArray(value)) continue;
          const labels = value.map((v) => question.options.find((o) => o.value === v)?.label ?? v);
          entries.push({ ...base, answer: labels });
          break;
        }
        case 'scale':
          if (typeof value !== 'number') continue;
          entries.push({ ...base, answer: value, scale: SCALE_HINT });
          break;
        case 'text':
          if (typeof value !== 'string' || !value.trim()) continue;
          entries.push({ ...base, answer: value.trim() });
          break;
      }
    }
  }
  return entries;
}

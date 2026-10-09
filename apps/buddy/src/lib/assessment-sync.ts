/**
 * Supabase backup of the onboarding answers (`public.onboarding_assessments`, ADR-006).
 * Pushes are queued so an older version can never land after a newer one from this device.
 */
import {
  fromAssessmentRow,
  pickRestore,
  syncAssessmentLocalFirst,
  toAssessmentRow,
  type AssessmentDoc,
  type AssessmentRow,
} from '@/domain/assessment';

import { loadAssessment, writeAssessment } from './assessment-storage';
import { getSupabase } from './supabase';

const TABLE = 'onboarding_assessments';

async function pushAssessment(doc: AssessmentDoc): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from(TABLE).upsert(toAssessmentRow(doc), { onConflict: 'user_id' });
  if (error) throw error;
}

/** Fetch the cloud copy. Returns undefined when offline, signed out, or nothing is stored. */
async function pullAssessment(userId: string): Promise<AssessmentDoc | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('user_id, answers, questionnaire_version, completed_at, updated_at')
      .eq('user_id', userId)
      .maybeSingle<AssessmentRow>();
    if (error || !data) return undefined;
    return fromAssessmentRow(data);
  } catch {
    return undefined;
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Push this user's local document if it has unsynced changes. Safe to call often; never throws. */
export function syncPendingAssessment(userId: string): Promise<AssessmentDoc | undefined> {
  const run = queue.then(async () => {
    const doc = loadAssessment(userId);
    if (!doc) return undefined;
    const result = await syncAssessmentLocalFirst(doc, {
      upsertRemote: pushAssessment,
      readLatest: () => loadAssessment(userId),
      writeLocal: writeAssessment,
    });
    return result.doc;
  });
  queue = run.catch(() => undefined);
  return run.catch(() => undefined);
}

/**
 * Load the best copy for this user: local first, merged with the cloud copy when reachable
 * (e.g. a new phone). Unsynced local edits are never overwritten.
 */
export async function restoreAssessment(userId: string): Promise<AssessmentDoc | undefined> {
  const local = loadAssessment(userId);
  const remote = await pullAssessment(userId);
  const chosen = pickRestore(local, remote);
  if (chosen && chosen !== local) writeAssessment(chosen);
  return chosen;
}

/**
 * Supabase backup of the player's XP (`public.player_progress`, ADR-010).
 * Pushes are queued and merged by max(XP), so a stale or duplicate push can never lower the total.
 */
import { hasUnsyncedXp, mergeRemote, newProgress, type ProgressDoc, type ProgressRow } from '@/domain/progress';

import { loadProgress, writeProgress } from './progress-storage';
import { getSupabase } from './supabase';

const TABLE = 'player_progress';

async function pullProgress(userId: string): Promise<ProgressRow | undefined> {
  const supabase = getSupabase();
  if (!supabase) return undefined;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('user_id, total_xp, updated_at')
      .eq('user_id', userId)
      .maybeSingle<ProgressRow>();
    return error || !data ? undefined : data;
  } catch {
    return undefined;
  }
}

/** Upsert, but never lower an existing cloud total (another device may be ahead). */
async function pushProgress(doc: ProgressDoc): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('save_player_xp', { new_total_xp: doc.totalXp });
  if (error) throw error;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Merge the cloud copy into the device copy, then push if the device is ahead.
 * `localXp` is the XP currently in memory (it may be ahead of the saved copy). Never throws.
 * Returns the merged document, which is already saved on the device.
 */
export function syncProgress(userId: string, localXp: number): Promise<ProgressDoc> {
  const run = queue.then(async () => {
    const now = new Date().toISOString();
    let doc = loadProgress(userId) ?? newProgress(userId, localXp, now);
    if (localXp > doc.totalXp) doc = { ...doc, totalXp: Math.floor(localXp), updatedAt: now };
    doc = mergeRemote(doc, await pullProgress(userId));
    writeProgress(doc);
    if (!hasUnsyncedXp(doc)) return doc;
    try {
      await pushProgress(doc);
      // Re-read: XP may have grown while the push was in flight; only mark what was pushed.
      const latest = loadProgress(userId) ?? doc;
      const synced = { ...latest, syncedXp: Math.max(latest.syncedXp ?? 0, doc.totalXp) };
      writeProgress(synced);
      return synced;
    } catch {
      return doc; // stays pending; retried on the next sync
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

/**
 * On-device copy of the player's XP (localStorage backed by expo-sqlite), one document per user.
 * This copy is the source of truth; `public.player_progress` is a backup (ADR-010).
 */
import 'expo-sqlite/localStorage/install';

import { PROGRESS_SCHEMA_VERSION, sanitizeXp, type ProgressDoc } from '@/domain/progress';

const keyFor = (userId: string) => `buddy.progress.${userId}`;

export function loadProgress(userId: string): ProgressDoc | undefined {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<ProgressDoc>;
    if (parsed.userId !== userId || typeof parsed.updatedAt !== 'string') return undefined;
    return {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      userId,
      totalXp: sanitizeXp(parsed.totalXp),
      updatedAt: parsed.updatedAt,
      syncedXp: typeof parsed.syncedXp === 'number' ? sanitizeXp(parsed.syncedXp) : null,
    };
  } catch {
    return undefined;
  }
}

export function writeProgress(doc: ProgressDoc): void {
  localStorage.setItem(keyFor(doc.userId), JSON.stringify(doc));
}

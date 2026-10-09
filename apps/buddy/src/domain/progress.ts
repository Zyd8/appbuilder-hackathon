/**
 * The player's XP, saved on the device and backed up to the account (ADR-010).
 * XP is never removed, so two copies merge by keeping the larger total: that is idempotent,
 * order-independent, and never loses XP earned offline on another device.
 */
export const PROGRESS_SCHEMA_VERSION = 1;

export interface ProgressDoc {
  schemaVersion: number;
  userId: string;
  totalXp: number;
  updatedAt: string;
  /** The `totalXp` that last reached the cloud, or null if none has. */
  syncedXp: number | null;
}

export interface ProgressRow {
  user_id: string;
  total_xp: number;
  updated_at: string;
}

export function sanitizeXp(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function newProgress(userId: string, totalXp: number, now: string): ProgressDoc {
  return { schemaVersion: PROGRESS_SCHEMA_VERSION, userId, totalXp: sanitizeXp(totalXp), updatedAt: now, syncedXp: null };
}

/** The local document with a new total (never lower than before). */
export function withTotalXp(doc: ProgressDoc, totalXp: number, now: string): ProgressDoc {
  const next = Math.max(doc.totalXp, sanitizeXp(totalXp));
  return next === doc.totalXp ? doc : { ...doc, totalXp: next, updatedAt: now };
}

/** Merge a cloud row into the local document. Keeps the larger XP; marks what the cloud already has. */
export function mergeRemote(local: ProgressDoc, remote: ProgressRow | undefined): ProgressDoc {
  if (!remote) return local;
  const remoteXp = sanitizeXp(remote.total_xp);
  const totalXp = Math.max(local.totalXp, remoteXp);
  const syncedXp = Math.max(local.syncedXp ?? 0, remoteXp);
  const updatedAt = totalXp === local.totalXp ? local.updatedAt : remote.updated_at;
  return { ...local, totalXp, updatedAt, syncedXp };
}

export function hasUnsyncedXp(doc: ProgressDoc): boolean {
  return doc.syncedXp === null || doc.totalXp > doc.syncedXp;
}

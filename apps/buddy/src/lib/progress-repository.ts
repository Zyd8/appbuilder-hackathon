import { newProgress, sanitizeXp, withTotalXp, type ProgressDoc } from '@/domain/progress';
import { grantXp, levelFromTotalXp, playerRank } from '@/domain/xp';

import type { BuddyDatabase } from './buddy-database';
import { loadProgress, writeProgress } from './progress-storage';
import { progressUserId, type RepositoryNamespace } from './repository-namespace';

export interface CompletionRecord { questId: string; completedOn: string; grantedXp: number }
export interface ProgressSnapshot { doc: ProgressDoc; level: number; rank: string }

/** The ADR-010 ProgressDoc remains the only XP total. SQLite persists the award ledger and repairs interrupted writes. */
export class ProgressRepository {
  constructor(private readonly db: BuddyDatabase, private readonly namespace: RepositoryNamespace) {}

  private userId(): string {
    return this.namespace.startsWith('guest:') ? this.namespace : progressUserId(this.namespace);
  }

  async hydrate(now: string): Promise<ProgressSnapshot> {
    const userId = this.userId();
    const local = loadProgress(userId) ?? newProgress(userId, 0, now);
    const sum = await this.db.getFirstAsync<{ total: number }>(
      'SELECT COALESCE(SUM(granted_xp),0) AS total FROM buddy_completions WHERE namespace=?', this.namespace);
    const awarded = sanitizeXp(sum?.total);
    const row = await this.db.getFirstAsync<{ baseline_xp: number }>(
      'SELECT baseline_xp FROM buddy_xp_baseline WHERE namespace=?', this.namespace);
    const baseline = Math.max(sanitizeXp(row?.baseline_xp), local.totalXp - awarded);
    await this.db.runAsync(`INSERT INTO buddy_xp_baseline(namespace,baseline_xp) VALUES (?,?)
      ON CONFLICT(namespace) DO UPDATE SET baseline_xp=MAX(baseline_xp,excluded.baseline_xp)`, this.namespace, baseline);
    const doc = withTotalXp(local, baseline + awarded, now);
    if (!loadProgress(userId) || doc !== local) writeProgress(doc);
    const level = levelFromTotalXp(doc.totalXp).level;
    return { doc, level, rank: playerRank(level).rank };
  }

  async earnedOn(date: string): Promise<number> {
    const row = await this.db.getFirstAsync<{ earned_xp: number }>(
      'SELECT earned_xp FROM buddy_daily_xp WHERE namespace=? AND date=?', this.namespace, date);
    return sanitizeXp(row?.earned_xp);
  }

  async completion(questId: string): Promise<CompletionRecord | null> {
    const row = await this.db.getFirstAsync<{ quest_id: string; completed_on: string; granted_xp: number }>(
      'SELECT quest_id,completed_on,granted_xp FROM buddy_completions WHERE namespace=? AND quest_id=?',
      this.namespace, questId);
    return row ? { questId: row.quest_id, completedOn: row.completed_on, grantedXp: row.granted_xp } : null;
  }

  /** Exactly one award per quest, with a durable daily cap. A duplicate returns the original award. */
  async recordCompletion(questId: string, date: string, questXp: number, now: string): Promise<CompletionRecord> {
    if (!questId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(questXp) || questXp < 0)
      throw new Error('Invalid completion');
    await this.hydrate(now);
    let record: CompletionRecord | null = null;
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      const existing = await tx.getFirstAsync<{ quest_id: string; completed_on: string; granted_xp: number }>(
        'SELECT quest_id,completed_on,granted_xp FROM buddy_completions WHERE namespace=? AND quest_id=?',
        this.namespace, questId);
      if (existing) {
        record = { questId, completedOn: existing.completed_on, grantedXp: existing.granted_xp };
        return;
      }
      const daily = await tx.getFirstAsync<{ earned_xp: number }>(
        'SELECT earned_xp FROM buddy_daily_xp WHERE namespace=? AND date=?', this.namespace, date);
      const grantedXp = grantXp(sanitizeXp(daily?.earned_xp), sanitizeXp(questXp));
      await tx.runAsync('INSERT INTO buddy_completions(namespace,quest_id,completed_on,granted_xp) VALUES (?,?,?,?)',
        this.namespace, questId, date, grantedXp);
      await tx.runAsync(`INSERT INTO buddy_daily_xp(namespace,date,earned_xp) VALUES (?,?,?)
        ON CONFLICT(namespace,date) DO UPDATE SET earned_xp=earned_xp+excluded.earned_xp`,
        this.namespace, date, grantedXp);
      record = { questId, completedOn: date, grantedXp };
    });
    await this.hydrate(now);
    if (!record) throw new Error('Completion transaction did not return a record');
    return record;
  }
}

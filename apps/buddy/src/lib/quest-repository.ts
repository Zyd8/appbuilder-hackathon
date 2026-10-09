import type { Quest } from '@/domain/types';

import type { BuddyDatabase } from './buddy-database';
import type { RepositoryNamespace } from './repository-namespace';

export interface RevisionedQuest { quest: Quest; revision: number }

export class QuestRepository {
  constructor(private readonly db: BuddyDatabase, private readonly namespace: RepositoryNamespace) {}

  async get(id: string): Promise<RevisionedQuest | null> {
    const row = await this.db.getFirstAsync<{ revision: number; quest_json: string }>(
      'SELECT revision, quest_json FROM buddy_quests WHERE namespace = ? AND id = ?', this.namespace, id);
    if (!row) return null;
    try {
      const quest = JSON.parse(row.quest_json) as Quest;
      return quest.id === id && typeof quest.status === 'string' ? { quest, revision: row.revision } : null;
    } catch { return null; }
  }

  async list(): Promise<RevisionedQuest[]> {
    const rows = await this.db.getAllAsync<{ id: string }>(
      'SELECT id FROM buddy_quests WHERE namespace = ? ORDER BY id', this.namespace);
    const values = await Promise.all(rows.map((row) => this.get(row.id)));
    return values.filter((value): value is RevisionedQuest => value !== null);
  }

  /** expectedRevision=0 inserts; otherwise compare-and-swap. */
  async put(quest: Quest, expectedRevision: number): Promise<RevisionedQuest | null> {
    if (!quest.id || !Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error('Invalid quest revision');
    const result = expectedRevision === 0
      ? await this.db.runAsync('INSERT OR IGNORE INTO buddy_quests(namespace,id,revision,quest_json) VALUES (?,?,1,?)',
        this.namespace, quest.id, JSON.stringify(quest))
      : await this.db.runAsync('UPDATE buddy_quests SET revision=revision+1,quest_json=? WHERE namespace=? AND id=? AND revision=?',
        JSON.stringify(quest), this.namespace, quest.id, expectedRevision);
    return result.changes ? { quest, revision: expectedRevision + 1 } : null;
  }

  /** Replace an offered quest and retain the rerolled row in one SQLite transaction. */
  async reroll(oldQuest: Quest, expectedRevision: number, replacement: Quest): Promise<RevisionedQuest | null> {
    if (!oldQuest.id || !replacement.id || oldQuest.id === replacement.id ||
        !Number.isInteger(expectedRevision) || expectedRevision < 1) throw new Error('Invalid reroll');
    let saved: RevisionedQuest | null = null;
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      const updated = await txn.runAsync(
        'UPDATE buddy_quests SET revision=revision+1,quest_json=? WHERE namespace=? AND id=? AND revision=?',
        JSON.stringify(oldQuest), this.namespace, oldQuest.id, expectedRevision);
      if (!updated.changes) return;
      const inserted = await txn.runAsync(
        'INSERT OR IGNORE INTO buddy_quests(namespace,id,revision,quest_json) VALUES (?,?,1,?)',
        this.namespace, replacement.id, JSON.stringify(replacement));
      if (!inserted.changes) throw new Error('Replacement quest ID already exists');
      saved = { quest: replacement, revision: 1 };
    });
    return saved;
  }
}

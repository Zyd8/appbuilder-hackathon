import type { CheckIn } from '@/domain/types';

import type { BuddyDatabase } from './buddy-database';
import type { RepositoryNamespace } from './repository-namespace';

export interface RevisionedCheckIn { checkIn: CheckIn; revision: number }

export class CheckInRepository {
  constructor(private readonly db: BuddyDatabase, private readonly namespace: RepositoryNamespace) {}

  async get(date: string): Promise<RevisionedCheckIn | null> {
    const row = await this.db.getFirstAsync<{ revision: number; check_in_json: string }>(
      'SELECT revision, check_in_json FROM buddy_check_ins WHERE namespace=? AND date=?', this.namespace, date);
    if (!row) return null;
    try {
      const checkIn = JSON.parse(row.check_in_json) as CheckIn;
      return checkIn.date === date && Number.isInteger(checkIn.mood) && checkIn.mood >= 1 && checkIn.mood <= 5
        ? { checkIn, revision: row.revision } : null;
    } catch { return null; }
  }

  async latest(): Promise<RevisionedCheckIn | null> {
    const row = await this.db.getFirstAsync<{ date: string }>(
      'SELECT date FROM buddy_check_ins WHERE namespace=? ORDER BY date DESC LIMIT 1', this.namespace);
    return row ? this.get(row.date) : null;
  }

  async put(checkIn: CheckIn, expectedRevision: number): Promise<RevisionedCheckIn | null> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn.date) || !Number.isInteger(expectedRevision) || expectedRevision < 0)
      throw new Error('Invalid check-in');
    const result = expectedRevision === 0
      ? await this.db.runAsync('INSERT OR IGNORE INTO buddy_check_ins(namespace,date,revision,check_in_json) VALUES (?,?,1,?)',
        this.namespace, checkIn.date, JSON.stringify(checkIn))
      : await this.db.runAsync('UPDATE buddy_check_ins SET revision=revision+1,check_in_json=? WHERE namespace=? AND date=? AND revision=?',
        JSON.stringify(checkIn), this.namespace, checkIn.date, expectedRevision);
    return result.changes ? { checkIn, revision: expectedRevision + 1 } : null;
  }
}

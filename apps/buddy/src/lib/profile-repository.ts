import type { ProfileAnalysis } from '@/domain/types';
import { PROFILE_ANALYSIS_VERSION } from '@/domain/profile-analysis';

import type { BuddyDatabase } from './buddy-database';
import type { RepositoryNamespace } from './repository-namespace';

export class ProfileRepository {
  constructor(private readonly db: BuddyDatabase, private readonly namespace: RepositoryNamespace) {}

  async read(): Promise<ProfileAnalysis | null> {
    const row = await this.db.getFirstAsync<{ revision: string; analysis_json: string }>(
      'SELECT revision, analysis_json FROM buddy_profiles WHERE namespace = ?', this.namespace);
    if (!row) return null;
    try {
      const value = JSON.parse(row.analysis_json) as ProfileAnalysis;
      if (value.revision !== row.revision || value.analysisVersion !== PROFILE_ANALYSIS_VERSION ||
          !Array.isArray(value.insights) || value.insights.length < 2 || !value.stats) return null;
      return value;
    } catch { return null; }
  }

  /** Rejects a stale assessment; identical revisions are idempotent. */
  async save(analysis: ProfileAnalysis): Promise<boolean> {
    const existing = await this.read();
    if (existing?.revision === analysis.revision) return true;
    if (existing && Date.parse(existing.assessmentUpdatedAt) > Date.parse(analysis.assessmentUpdatedAt)) return false;
    if (analysis.analysisVersion !== PROFILE_ANALYSIS_VERSION || !Number.isFinite(Date.parse(analysis.assessmentUpdatedAt)))
      throw new Error('Invalid profile analysis');
    const result = await this.db.runAsync(`INSERT INTO buddy_profiles(namespace, revision, analysis_json, updated_at)
      VALUES (?, ?, ?, ?) ON CONFLICT(namespace) DO UPDATE SET revision=excluded.revision,
      analysis_json=excluded.analysis_json, updated_at=excluded.updated_at
      WHERE buddy_profiles.updated_at <= excluded.updated_at`,
      this.namespace, analysis.revision, JSON.stringify(analysis), analysis.assessmentUpdatedAt);
    return result.changes > 0;
  }
}

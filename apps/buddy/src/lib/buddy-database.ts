import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const BUDDY_DATABASE_VERSION = 1;
export type BuddyDatabase = SQLiteDatabase;

/** All user data tables use a namespace as part of their primary key. */
export async function migrateBuddyDatabase(db: BuddyDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS buddy_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS buddy_profiles (
      namespace TEXT PRIMARY KEY, revision TEXT NOT NULL, analysis_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS buddy_quests (
      namespace TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL,
      quest_json TEXT NOT NULL, PRIMARY KEY(namespace, id)
    );
    CREATE TABLE IF NOT EXISTS buddy_check_ins (
      namespace TEXT NOT NULL, date TEXT NOT NULL, revision INTEGER NOT NULL,
      check_in_json TEXT NOT NULL, PRIMARY KEY(namespace, date)
    );
    CREATE TABLE IF NOT EXISTS buddy_completions (
      namespace TEXT NOT NULL, quest_id TEXT NOT NULL, completed_on TEXT NOT NULL,
      granted_xp INTEGER NOT NULL, PRIMARY KEY(namespace, quest_id)
    );
    CREATE TABLE IF NOT EXISTS buddy_daily_xp (
      namespace TEXT NOT NULL, date TEXT NOT NULL, earned_xp INTEGER NOT NULL,
      PRIMARY KEY(namespace, date)
    );
    CREATE TABLE IF NOT EXISTS buddy_xp_baseline (
      namespace TEXT PRIMARY KEY, baseline_xp INTEGER NOT NULL
    );
    INSERT OR IGNORE INTO buddy_meta(key, value) VALUES ('schema_version', 1);
  `);
  const row = await db.getFirstAsync<{ value: number }>('SELECT value FROM buddy_meta WHERE key = ?', 'schema_version');
  if (row?.value !== BUDDY_DATABASE_VERSION) throw new Error('Unsupported Buddy database version');
}

export async function openBuddyDatabase(name = 'buddy-phase2.db'): Promise<BuddyDatabase> {
  const db = await openDatabaseAsync(name);
  try { await migrateBuddyDatabase(db); return db; }
  catch (error) { await db.closeAsync(); throw error; }
}

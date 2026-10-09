/// <reference types="jest" />
import { BUDDY_DATABASE_VERSION, migrateBuddyDatabase, type BuddyDatabase } from '../buddy-database';

type SqlValue = string | number | null;
interface Statement {
  run(...values: SqlValue[]): { changes: bigint; lastInsertRowid: bigint };
  get(...values: SqlValue[]): unknown;
  all(...values: SqlValue[]): unknown[];
}
declare function require(id: 'node:sqlite'): { DatabaseSync: new (name: string) => {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
} };
declare function require(id: 'node:fs'): {
  mkdtempSync(prefix: string): string;
  rmSync(path: string, options: { recursive: boolean; force: boolean }): void;
};
const { DatabaseSync } = require('node:sqlite');

/** Node SQLite exercises the production SQL without needing a native Expo runtime. */
export function testDatabase(name = ':memory:'): BuddyDatabase {
  const sqlite = new DatabaseSync(name);
  const wrap = {
    execAsync: async (sql: string) => { sqlite.exec(sql); },
    runAsync: async (sql: string, ...params: unknown[]) => {
      const info = sqlite.prepare(sql).run(...(params as SqlValue[]));
      return { changes: Number(info.changes), lastInsertRowId: Number(info.lastInsertRowid) };
    },
    getFirstAsync: async <T>(sql: string, ...params: unknown[]): Promise<T | null> =>
      (sqlite.prepare(sql).get(...(params as SqlValue[])) as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string, ...params: unknown[]): Promise<T[]> =>
      sqlite.prepare(sql).all(...(params as SqlValue[])) as T[],
    withExclusiveTransactionAsync: async (fn: (tx: unknown) => Promise<void>) => {
      sqlite.exec('BEGIN IMMEDIATE');
      try { await fn(wrap); sqlite.exec('COMMIT'); }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    closeAsync: async () => { sqlite.close(); },
  };
  return wrap as unknown as BuddyDatabase;
}

it('creates and reruns version 1 migration without dropping data', async () => {
  const db = testDatabase();
  await migrateBuddyDatabase(db);
  await db.runAsync('INSERT INTO buddy_daily_xp(namespace,date,earned_xp) VALUES (?,?,?)', 'guest:g', '2026-10-10', 10);
  await migrateBuddyDatabase(db);
  expect((await db.getFirstAsync<{ value: number }>('SELECT value FROM buddy_meta WHERE key=?', 'schema_version'))?.value)
    .toBe(BUDDY_DATABASE_VERSION);
  expect((await db.getFirstAsync<{ earned_xp: number }>('SELECT earned_xp FROM buddy_daily_xp'))?.earned_xp).toBe(10);
  await db.closeAsync();
});

it('retains data after closing and reopening the SQLite file', async () => {
  const fs = require('node:fs');
  const directory = fs.mkdtempSync('/tmp/buddy-db-test-');
  try {
    const first = testDatabase(`${directory}/buddy.db`);
    await migrateBuddyDatabase(first);
    await first.runAsync('INSERT INTO buddy_daily_xp(namespace,date,earned_xp) VALUES (?,?,?)',
      'account:u1', '2026-10-10', 35);
    await first.closeAsync();
    const second = testDatabase(`${directory}/buddy.db`);
    await migrateBuddyDatabase(second);
    expect((await second.getFirstAsync<{ earned_xp: number }>(
      'SELECT earned_xp FROM buddy_daily_xp WHERE namespace=?', 'account:u1'))?.earned_xp).toBe(35);
    await second.closeAsync();
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

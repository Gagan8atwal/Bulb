// src/services/db/sqlite.ts
// SQLite singleton.
//
// RULES:
//   • Call getDb() at the start of any repo function — it's safe to call repeatedly.
//   • Never import SQLite directly in feature code — always go through getDb().
//   • Schema is applied idempotently (CREATE TABLE IF NOT EXISTS).
//   • WAL mode is enabled for better concurrent read performance.
//
// expo-sqlite v14 (SDK 52) API:
//   openDatabaseAsync(name)        → SQLiteDatabase
//   db.execAsync(sql)              → runs DDL / multi-statement SQL
//   db.runAsync(sql, params)       → INSERT / UPDATE / DELETE → SQLiteRunResult
//   db.getAllAsync<T>(sql, params)  → SELECT → T[]
//   db.getFirstAsync<T>(sql, params) → SELECT → T | null
//   db.withTransactionAsync(fn)    → atomic transaction

import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, LOCAL_DB_VERSION } from './localSchema';
import { logger } from '../../lib/logger';
import { nowIso } from '../../lib/time';

const DB_NAME = 'al-command.db';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndInit(): Promise<SQLite.SQLiteDatabase> {
  logger.debug('SQLite: opening database', DB_NAME);
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // Apply schema (all CREATE TABLE IF NOT EXISTS → idempotent)
  await db.execAsync(CREATE_TABLES_SQL);

  // Record schema version if not already present
  const existing = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version WHERE version = ?',
    [LOCAL_DB_VERSION]
  );
  if (!existing) {
    await db.runAsync(
      'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
      [LOCAL_DB_VERSION, nowIso()]
    );
    logger.debug('SQLite: schema version', LOCAL_DB_VERSION, 'recorded');
  }

  logger.debug('SQLite: ready');
  return db;
}

/**
 * Returns the open, initialized SQLiteDatabase.
 * Safe to call multiple times — initializes exactly once.
 * Concurrent callers await the same promise.
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = openAndInit().then((db) => {
    _db = db;
    _initPromise = null;
    return db;
  });

  return _initPromise;
}

/**
 * Drop all local data. Called on "Sign out & clear data".
 * Closes the current connection so getDb() will re-initialise on next call.
 */
export async function clearLocalDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM outbox;
    DELETE FROM memory_items;
    DELETE FROM tasks;
    DELETE FROM projects;
    DELETE FROM schema_version;
  `);
  // Close so re-open triggers fresh init
  await db.closeAsync();
  _db = null;
  logger.debug('SQLite: local database cleared');
}

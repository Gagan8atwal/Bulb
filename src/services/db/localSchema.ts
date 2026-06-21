// src/services/db/localSchema.ts
// DDL for the local SQLite database.
//
// RULES:
//   • Column names and types MUST match the Supabase schema exactly.
//   • TEXT is used for all types (SQLite is loosely typed; timestamps are ISO strings).
//   • INTEGER is used for tries (outbox) — the only true integer.
//   • The outbox table is LOCAL ONLY — it never exists on the server.
//   • Version field in schema_version drives migrations without a library.

export const LOCAL_DB_VERSION = 1;

/**
 * All DDL statements run once when the database is first opened.
 * Wrapped in a single execAsync call for atomicity.
 */
export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- ──────────────────────────────────────────────────────────────────
  -- Schema version tracking (lightweight migration control)
  -- ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS schema_version (
    version  INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
  );

  -- ──────────────────────────────────────────────────────────────────
  -- projects (mirrors public.projects)
  -- ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS projects (
    id         TEXT PRIMARY KEY,
    owner_id   TEXT NOT NULL,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS projects_owner_status
    ON projects (owner_id, status)
    WHERE deleted_at IS NULL;

  -- ──────────────────────────────────────────────────────────────────
  -- tasks (mirrors public.tasks)
  -- ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS tasks (
    id         TEXT PRIMARY KEY,
    owner_id   TEXT NOT NULL,
    project_id TEXT,
    title      TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'todo',
    source     TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS tasks_owner_status
    ON tasks (owner_id, status)
    WHERE deleted_at IS NULL;

  CREATE INDEX IF NOT EXISTS tasks_project
    ON tasks (project_id)
    WHERE deleted_at IS NULL;

  -- ──────────────────────────────────────────────────────────────────
  -- memory_items (mirrors public.memory_items; no embedding in Sprint 1)
  -- ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS memory_items (
    id         TEXT PRIMARY KEY,
    owner_id   TEXT NOT NULL,
    project_id TEXT,
    kind       TEXT NOT NULL DEFAULT 'note',
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS memory_items_owner
    ON memory_items (owner_id, created_at DESC)
    WHERE deleted_at IS NULL;

  -- ──────────────────────────────────────────────────────────────────
  -- outbox (LOCAL ONLY — not synced to server)
  -- Every mutation is queued here. The sync engine reads and empties it.
  -- ──────────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS outbox (
    id         TEXT    PRIMARY KEY,
    op         TEXT    NOT NULL,             -- 'insert' | 'update' | 'delete'
    entity     TEXT    NOT NULL,             -- 'project' | 'task' | 'note'
    entity_id  TEXT    NOT NULL,
    payload    TEXT    NOT NULL,             -- JSON.stringify of the row
    created_at TEXT    NOT NULL,
    tries      INTEGER NOT NULL DEFAULT 0,
    status     TEXT    NOT NULL DEFAULT 'pending'  -- 'pending' | 'failed'
  );

  CREATE INDEX IF NOT EXISTS outbox_status_time
    ON outbox (status, created_at ASC);
`;

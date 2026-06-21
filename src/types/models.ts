// src/types/models.ts
// Single source of truth for all Sprint 1 data shapes.
// Rule: these interfaces mirror BOTH the Supabase schema AND the local SQLite schema.
// Note: no `embedding` column on MemoryItem yet — that comes in a later sprint.

// ─── Literals ────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'archived';
export type TaskStatus = 'todo' | 'done';
export type TaskSource = 'manual' | 'text' | 'voice';
export type MemoryItemKind = 'note';

export type OutboxOp = 'insert' | 'update' | 'delete';
export type OutboxEntity = 'project' | 'task' | 'note';
export type OutboxStatus = 'pending' | 'failed';

// ─── Domain entities ─────────────────────────────────────────────────────────

export interface Project {
  id: string;            // uuid v4, client-generated
  owner_id: string;      // auth.uid()
  name: string;
  status: ProjectStatus;
  created_at: string;    // ISO 8601
  updated_at: string;    // ISO 8601
  deleted_at: string | null;
}

export interface Task {
  id: string;
  owner_id: string;
  project_id: string | null;  // null = Inbox
  title: string;
  status: TaskStatus;
  source: TaskSource;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MemoryItem {
  id: string;
  owner_id: string;
  project_id: string | null;
  kind: MemoryItemKind;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ─── Outbox (local only — never synced to server) ────────────────────────────

export interface OutboxItem {
  id: string;            // uuid, identifies this outbox row
  op: OutboxOp;
  entity: OutboxEntity;
  entity_id: string;     // id of the project/task/note being mutated
  payload: string;       // JSON.stringify of the full row to upsert/delete
  created_at: string;
  tries: number;
  status: OutboxStatus;  // 'pending' | 'failed' (> 8 tries)
}

// ─── Input types (create operations) ─────────────────────────────────────────

export interface CreateProjectInput {
  name: string;
}

export interface CreateTaskInput {
  title: string;
  source: TaskSource;
  project_id?: string | null;
}

export interface CreateNoteInput {
  content: string;
  project_id?: string | null;
}

// ─── Sync state ───────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  email: string | null;
  display_name: string | null;
}

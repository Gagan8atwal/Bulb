// src/services/db/tasksRepo.ts
// Local SQLite CRUD for tasks. Same transaction + outbox pattern as projectsRepo.

import { getDb } from './sqlite';
import { enqueueOutbox } from './outboxRepo';
import { Task, CreateTaskInput, TaskStatus } from '../../types/models';
import { generateId } from '../../lib/id';
import { nowIso } from '../../lib/time';

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * All non-deleted tasks for the owner, sorted newest-first.
 * Today screen reads this.
 */
export async function listAllTasks(ownerId: string): Promise<Task[]> {
  const db = await getDb();
  return db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE owner_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [ownerId]
  );
}

/**
 * All non-deleted tasks for a specific project (null = Inbox).
 * Project Detail screen reads this.
 */
export async function listTasksByProject(
  ownerId: string,
  projectId: string | null
): Promise<Task[]> {
  const db = await getDb();
  if (projectId === null) {
    return db.getAllAsync<Task>(
      `SELECT * FROM tasks
       WHERE owner_id = ? AND project_id IS NULL AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [ownerId]
    );
  }
  return db.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE owner_id = ? AND project_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [ownerId, projectId]
  );
}

/**
 * Count of open ('todo') tasks for a project. Used in ProjectCard.
 */
export async function countOpenTasksByProject(
  ownerId: string,
  projectId: string
): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM tasks
     WHERE owner_id = ? AND project_id = ? AND status = 'todo' AND deleted_at IS NULL`,
    [ownerId, projectId]
  );
  return row?.count ?? 0;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTask(
  ownerId: string,
  input: CreateTaskInput
): Promise<Task> {
  const db = await getDb();
  const now = nowIso();
  const task: Task = {
    id: generateId(),
    owner_id: ownerId,
    project_id: input.project_id ?? null,
    title: input.title.trim(),
    status: 'todo',
    source: input.source,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO tasks (id, owner_id, project_id, title, status, source, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [task.id, task.owner_id, task.project_id, task.title, task.status,
       task.source, task.created_at, task.updated_at, task.deleted_at]
    );
    await enqueueOutbox(db, {
      op: 'insert',
      entity: 'task',
      entity_id: task.id,
      payload: task,
    });
  });

  return task;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

/**
 * Toggle task status between 'todo' and 'done'.
 * Optimistic on device — outbox carries it to the server.
 */
export async function toggleTask(ownerId: string, id: string): Promise<TaskStatus> {
  const db = await getDb();
  const task = await db.getFirstAsync<Task>(
    'SELECT * FROM tasks WHERE id = ? AND owner_id = ?',
    [id, ownerId]
  );
  if (!task) throw new Error(`Task ${id} not found`);

  const nextStatus: TaskStatus = task.status === 'todo' ? 'done' : 'todo';
  const now = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
      [nextStatus, now, id]
    );
    await enqueueOutbox(db, {
      op: 'update',
      entity: 'task',
      entity_id: id,
      payload: { ...task, status: nextStatus, updated_at: now },
    });
  });

  return nextStatus;
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function softDeleteTask(ownerId: string, id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
      [now, now, id, ownerId]
    );
    await enqueueOutbox(db, {
      op: 'delete',
      entity: 'task',
      entity_id: id,
      payload: { id, deleted_at: now },
    });
  });
}

// ─── Sync helpers ─────────────────────────────────────────────────────────────

export async function upsertTaskFromServer(task: Task): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO tasks (id, owner_id, project_id, title, status, source, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       project_id = excluded.project_id,
       title      = excluded.title,
       status     = excluded.status,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [task.id, task.owner_id, task.project_id, task.title, task.status,
     task.source, task.created_at, task.updated_at, task.deleted_at]
  );
}

export async function reconcileTasks(
  ownerId: string,
  serverIds: string[]
): Promise<void> {
  const db = await getDb();
  if (serverIds.length === 0) {
    await db.runAsync('DELETE FROM tasks WHERE owner_id = ?', [ownerId]);
    return;
  }
  const placeholders = serverIds.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM tasks WHERE owner_id = ? AND id NOT IN (${placeholders})`,
    [ownerId, ...serverIds]
  );
}

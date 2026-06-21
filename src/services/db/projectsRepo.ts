// src/services/db/projectsRepo.ts
// Local SQLite CRUD for projects.
//
// ARCHITECTURE RULES:
//   • Every write (create/update/delete) happens inside a transaction.
//   • Inside the transaction: (1) mutate entity table, (2) enqueue outbox.
//   • The UI reads from this repo — never from Supabase directly.
//   • owner_id is always the current user's auth.uid(), passed in by the caller.

import { getDb } from './sqlite';
import { enqueueOutbox } from './outboxRepo';
import { Project, CreateProjectInput, ProjectStatus } from '../../types/models';
import { generateId } from '../../lib/id';
import { nowIso } from '../../lib/time';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listProjects(ownerId: string): Promise<Project[]> {
  const db = await getDb();
  return db.getAllAsync<Project>(
    `SELECT * FROM projects
     WHERE owner_id = ? AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [ownerId]
  );
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await getDb();
  return db.getFirstAsync<Project>(
    'SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProject(
  ownerId: string,
  input: CreateProjectInput
): Promise<Project> {
  const db = await getDb();
  const now = nowIso();
  const project: Project = {
    id: generateId(),
    owner_id: ownerId,
    name: input.name.trim(),
    status: 'active',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO projects (id, owner_id, name, status, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project.id, project.owner_id, project.name, project.status,
       project.created_at, project.updated_at, project.deleted_at]
    );
    await enqueueOutbox(db, {
      op: 'insert',
      entity: 'project',
      entity_id: project.id,
      payload: project,
    });
  });

  return project;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProjectName(
  ownerId: string,
  id: string,
  name: string
): Promise<void> {
  const db = await getDb();
  const now = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE projects SET name = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
      [name.trim(), now, id, ownerId]
    );
    const updated = await db.getFirstAsync<Project>(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    if (updated) {
      await enqueueOutbox(db, {
        op: 'update',
        entity: 'project',
        entity_id: id,
        payload: updated,
      });
    }
  });
}

export async function archiveProject(ownerId: string, id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE projects SET status = 'archived', updated_at = ? WHERE id = ? AND owner_id = ?`,
      [now, id, ownerId]
    );
    const updated = await db.getFirstAsync<Project>(
      'SELECT * FROM projects WHERE id = ?',
      [id]
    );
    if (updated) {
      await enqueueOutbox(db, {
        op: 'update',
        entity: 'project',
        entity_id: id,
        payload: updated,
      });
    }
  });
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function softDeleteProject(ownerId: string, id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE projects SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
      [now, now, id, ownerId]
    );
    await enqueueOutbox(db, {
      op: 'delete',
      entity: 'project',
      entity_id: id,
      payload: { id, deleted_at: now },
    });
  });
}

// ─── Sync helpers (called by pullSnapshot) ────────────────────────────────────

/**
 * Upsert a project from the server snapshot.
 * Used during full-refetch pull — no outbox entry (this IS the server truth).
 */
export async function upsertProjectFromServer(project: Project): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO projects (id, owner_id, name, status, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       status = excluded.status,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [project.id, project.owner_id, project.name, project.status,
     project.created_at, project.updated_at, project.deleted_at]
  );
}

/**
 * Remove all local projects not present in the server snapshot.
 * Called at the end of pullSnapshot to reconcile deletions.
 */
export async function reconcileProjects(
  ownerId: string,
  serverIds: string[]
): Promise<void> {
  const db = await getDb();
  if (serverIds.length === 0) {
    await db.runAsync('DELETE FROM projects WHERE owner_id = ?', [ownerId]);
    return;
  }
  const placeholders = serverIds.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM projects WHERE owner_id = ? AND id NOT IN (${placeholders})`,
    [ownerId, ...serverIds]
  );
}

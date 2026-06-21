// src/services/db/memoryRepo.ts
// Local SQLite CRUD for notes (memory_items where kind = 'note').
// Sprint 1 only supports kind='note'. Future sprints add kind='decision', 'ai_output', etc.

import { getDb } from './sqlite';
import { enqueueOutbox } from './outboxRepo';
import { MemoryItem, CreateNoteInput } from '../../types/models';
import { generateId } from '../../lib/id';
import { nowIso } from '../../lib/time';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listNotes(ownerId: string): Promise<MemoryItem[]> {
  const db = await getDb();
  return db.getAllAsync<MemoryItem>(
    `SELECT * FROM memory_items
     WHERE owner_id = ? AND kind = 'note' AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [ownerId]
  );
}

export async function listNotesByProject(
  ownerId: string,
  projectId: string | null
): Promise<MemoryItem[]> {
  const db = await getDb();
  if (projectId === null) {
    return db.getAllAsync<MemoryItem>(
      `SELECT * FROM memory_items
       WHERE owner_id = ? AND project_id IS NULL AND kind = 'note' AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [ownerId]
    );
  }
  return db.getAllAsync<MemoryItem>(
    `SELECT * FROM memory_items
     WHERE owner_id = ? AND project_id = ? AND kind = 'note' AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [ownerId, projectId]
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createNote(
  ownerId: string,
  input: CreateNoteInput
): Promise<MemoryItem> {
  const db = await getDb();
  const now = nowIso();
  const item: MemoryItem = {
    id: generateId(),
    owner_id: ownerId,
    project_id: input.project_id ?? null,
    kind: 'note',
    content: input.content.trim(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO memory_items (id, owner_id, project_id, kind, content, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.owner_id, item.project_id, item.kind, item.content,
       item.created_at, item.updated_at, item.deleted_at]
    );
    await enqueueOutbox(db, {
      op: 'insert',
      entity: 'note',
      entity_id: item.id,
      payload: item,
    });
  });

  return item;
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function softDeleteNote(ownerId: string, id: string): Promise<void> {
  const db = await getDb();
  const now = nowIso();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE memory_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND owner_id = ?',
      [now, now, id, ownerId]
    );
    await enqueueOutbox(db, {
      op: 'delete',
      entity: 'note',
      entity_id: id,
      payload: { id, deleted_at: now },
    });
  });
}

// ─── Sync helpers ─────────────────────────────────────────────────────────────

export async function upsertNoteFromServer(item: MemoryItem): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO memory_items (id, owner_id, project_id, kind, content, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       project_id = excluded.project_id,
       content    = excluded.content,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at`,
    [item.id, item.owner_id, item.project_id, item.kind, item.content,
     item.created_at, item.updated_at, item.deleted_at]
  );
}

export async function reconcileNotes(
  ownerId: string,
  serverIds: string[]
): Promise<void> {
  const db = await getDb();
  if (serverIds.length === 0) {
    await db.runAsync('DELETE FROM memory_items WHERE owner_id = ?', [ownerId]);
    return;
  }
  const placeholders = serverIds.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM memory_items WHERE owner_id = ? AND id NOT IN (${placeholders})`,
    [ownerId, ...serverIds]
  );
}

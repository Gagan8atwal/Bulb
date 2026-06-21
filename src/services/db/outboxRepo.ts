// src/services/db/outboxRepo.ts
// Outbox repository — the write side of the offline sync architecture.
//
// CRITICAL CORRECTNESS RULES:
//   1. Push items OLDEST-FIRST (ASC created_at, status='pending').
//      If a later update arrives before its insert, the server will reject it.
//   2. Stop on first failure. If item N fails, don't process N+1.
//      Preserving order prevents partial application of a sequence.
//   3. On push success → DELETE the outbox row (not mark done).
//   4. On push failure → increment tries. After MAX_TRIES → status='failed'.
//   5. 'failed' rows are surfaced to the UI once and require manual retry.
//
// The outbox table schema is LOCAL ONLY. It is never pushed to Supabase.

import { getDb } from './sqlite';
import { OutboxEntity, OutboxItem, OutboxOp } from '../../types/models';
import { generateId } from '../../lib/id';
import { nowIso } from '../../lib/time';

export const OUTBOX_MAX_TRIES = 8;

// ─── Write (called by repos inside transactions) ──────────────────────────────

interface EnqueueParams {
  op: OutboxOp;
  entity: OutboxEntity;
  entity_id: string;
  payload: object;  // will be JSON.stringify'd
}

/**
 * Add a mutation to the outbox.
 * MUST be called inside a transaction alongside the entity table write.
 * (The caller — projectsRepo, tasksRepo, etc. — owns the transaction.)
 */
export async function enqueueOutbox(db: Awaited<ReturnType<typeof getDb>>, params: EnqueueParams): Promise<void> {
  const item: OutboxItem = {
    id: generateId(),
    op: params.op,
    entity: params.entity,
    entity_id: params.entity_id,
    payload: JSON.stringify(params.payload),
    created_at: nowIso(),
    tries: 0,
    status: 'pending',
  };

  await db.runAsync(
    `INSERT INTO outbox (id, op, entity, entity_id, payload, created_at, tries, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.op, item.entity, item.entity_id, item.payload, item.created_at, item.tries, item.status]
  );
}

// ─── Read (called by sync engine) ────────────────────────────────────────────

/**
 * Return all pending outbox items, OLDEST FIRST.
 * The sync engine processes these in order and stops on first failure.
 */
export async function getPendingOutbox(): Promise<OutboxItem[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxItem>(
    `SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC`
  );
}

/**
 * Return all failed outbox items (tries > MAX_TRIES).
 * Used to surface "N changes couldn't sync" in the UI.
 */
export async function getFailedOutbox(): Promise<OutboxItem[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxItem>(
    `SELECT * FROM outbox WHERE status = 'failed' ORDER BY created_at ASC`
  );
}

// ─── Success / failure (called by sync engine after each attempt) ─────────────

/**
 * Remove a successfully pushed outbox item.
 * Idempotent — deleting a non-existent row is a no-op.
 */
export async function markOutboxSuccess(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox WHERE id = ?', [id]);
}

/**
 * Increment tries. If tries exceeds MAX_TRIES, mark as 'failed'.
 * Failed items stop blocking the queue but are surfaced to the user.
 */
export async function markOutboxFailure(id: string): Promise<void> {
  const db = await getDb();
  // Increment tries
  await db.runAsync('UPDATE outbox SET tries = tries + 1 WHERE id = ?', [id]);
  // Promote to 'failed' if limit reached
  await db.runAsync(
    `UPDATE outbox SET status = 'failed' WHERE id = ? AND tries >= ?`,
    [id, OUTBOX_MAX_TRIES]
  );
}

/**
 * Reset a failed item back to pending (user-initiated retry).
 */
export async function retryFailedItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE outbox SET status = 'pending', tries = 0 WHERE id = ?`,
    [id]
  );
}

/**
 * Clear the entire outbox. Called on "Sign out & clear data".
 */
export async function clearOutbox(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM outbox');
}

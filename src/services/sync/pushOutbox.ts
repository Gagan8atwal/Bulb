// src/services/sync/pushOutbox.ts
// Pushes pending outbox items to Supabase, oldest-first.
//
// CRITICAL: Process in order. Stop on first failure.
// Reason: an UPDATE for item N depends on the INSERT for item N having succeeded.
// A failure at item N means N+1 (which may reference N's row) must not be attempted.

import {
  getPendingOutbox,
  markOutboxSuccess,
  markOutboxFailure,
} from '../db/outboxRepo';
import { upsertProjectRemote, softDeleteProjectRemote } from '../api/projectsApi';
import { upsertTaskRemote, softDeleteTaskRemote } from '../api/tasksApi';
import { upsertNoteRemote, softDeleteNoteRemote } from '../api/memoryApi';
import { OutboxItem, Project, Task, MemoryItem } from '../../types/models';
import { logger } from '../../lib/logger';

// ─── Dispatch: route one outbox item to the correct API call ─────────────────

async function executeOutboxItem(item: OutboxItem): Promise<void> {
  const payload = JSON.parse(item.payload);

  switch (item.entity) {
    case 'project': {
      if (item.op === 'delete') {
        await softDeleteProjectRemote(item.entity_id, payload.deleted_at);
      } else {
        await upsertProjectRemote(payload as Project);
      }
      break;
    }
    case 'task': {
      if (item.op === 'delete') {
        await softDeleteTaskRemote(item.entity_id, payload.deleted_at);
      } else {
        await upsertTaskRemote(payload as Task);
      }
      break;
    }
    case 'note': {
      if (item.op === 'delete') {
        await softDeleteNoteRemote(item.entity_id, payload.deleted_at);
      } else {
        await upsertNoteRemote(payload as MemoryItem);
      }
      break;
    }
    default: {
      // Unknown entity — skip it (don't block queue)
      const _exhaustive: never = item.entity;
      logger.warn('pushOutbox: unknown entity type', item.entity);
    }
  }
}

// ─── Push loop ────────────────────────────────────────────────────────────────

export interface PushResult {
  pushed: number;
  failed: boolean;
  failedItem?: OutboxItem;
}

/**
 * Push all pending outbox items in chronological order.
 * Returns immediately on the first error — preserves ordering invariant.
 */
export async function pushOutbox(): Promise<PushResult> {
  const pending = await getPendingOutbox();

  if (pending.length === 0) {
    return { pushed: 0, failed: false };
  }

  logger.debug(`pushOutbox: ${pending.length} item(s) to push`);

  let pushed = 0;

  for (const item of pending) {
    try {
      await executeOutboxItem(item);
      await markOutboxSuccess(item.id);
      pushed++;
      logger.debug(`pushOutbox: ✓ ${item.entity}/${item.op} id=${item.entity_id}`);
    } catch (err) {
      logger.warn(`pushOutbox: ✗ ${item.entity}/${item.op} id=${item.entity_id}`, err);
      await markOutboxFailure(item.id);
      // STOP — do not process later items
      return { pushed, failed: true, failedItem: item };
    }
  }

  return { pushed, failed: false };
}

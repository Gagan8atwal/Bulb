// src/services/sync/syncEngine.ts
// Sync engine — the sole orchestrator of data movement between SQLite and Supabase.
//
// Trigger points (all call runSync):
//   1. App foreground (AppState 'active')
//   2. Network comes online (NetInfo)
//   3. Pull-to-refresh from any screen
//   4. 60s timer while foregrounded
//
// Sequence (always): push → pull
//   Push first: ensures local changes reach the server before we overwrite local
//   with the server snapshot. Without this, a local change made offline would be
//   wiped by the pull that immediately follows.
//
// Concurrency: a lock (_running) prevents overlapping sync cycles.
// If a sync is in progress when a trigger fires, the trigger is a no-op.

import { pushOutbox } from './pushOutbox';
import { pullSnapshot } from './pullSnapshot';
import { getFailedOutbox } from '../db/outboxRepo';
import { logger } from '../../lib/logger';

// ─── State ────────────────────────────────────────────────────────────────────

let _running = false;

export type SyncEventType =
  | 'sync_start'
  | 'sync_success'
  | 'sync_error'
  | 'sync_skipped'; // already running

export interface SyncEvent {
  type: SyncEventType;
  failedCount?: number;  // items stuck in failed state after sync
  error?: string;
}

// Lightweight event bus: screens subscribe to these events to update UI
const _listeners = new Set<(event: SyncEvent) => void>();

export function onSyncEvent(handler: (event: SyncEvent) => void): () => void {
  _listeners.add(handler);
  return () => _listeners.delete(handler); // returns unsubscribe fn
}

function emit(event: SyncEvent): void {
  _listeners.forEach((fn) => fn(event));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Run one push → pull cycle.
 * Safe to call multiple times; concurrent calls are no-ops.
 *
 * @param ownerId - auth.uid() of the signed-in user
 * @returns true if sync completed, false if skipped (already running)
 */
export async function runSync(ownerId: string): Promise<boolean> {
  if (_running) {
    logger.debug('syncEngine: already running — skip');
    emit({ type: 'sync_skipped' });
    return false;
  }

  _running = true;
  emit({ type: 'sync_start' });
  logger.debug('syncEngine: cycle start');

  try {
    // ── 1. Push ──────────────────────────────────────────────────────────────
    const pushResult = await pushOutbox();
    if (pushResult.failed) {
      logger.warn('syncEngine: push stopped on failure — partial push');
      // Still attempt pull; server may have data we need even if push stalled
    }

    // ── 2. Pull ──────────────────────────────────────────────────────────────
    await pullSnapshot(ownerId);

    // ── 3. Check for stuck items ──────────────────────────────────────────────
    const failed = await getFailedOutbox();

    emit({ type: 'sync_success', failedCount: failed.length });
    logger.debug('syncEngine: cycle complete', {
      pushed: pushResult.pushed,
      pushFailed: pushResult.failed,
      stuckItems: failed.length,
    });

    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('syncEngine: cycle error:', message);
    emit({ type: 'sync_error', error: message });
    return false;
  } finally {
    _running = false;
  }
}

/**
 * Check if a sync cycle is currently in progress.
 */
export function isSyncing(): boolean {
  return _running;
}

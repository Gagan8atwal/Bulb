// src/services/sync/syncEngine.web.ts
// WEB implementation of the sync engine.
//
// On native, runSync() pushes the outbox to Supabase and pulls a fresh snapshot
// into SQLite. On web there is no local cache or outbox — every write already
// went straight to Supabase — so there is nothing to push or pull.
//
// runSync() therefore just emits sync_start → sync_success. That success event
// is what the feature hooks listen for to re-read their data, so pull-to-refresh
// still does the right thing: it re-fetches from Supabase. The SyncBadge briefly
// shows "Syncing…" then clears, exactly as on native.
//
// The event-bus API is identical to the native syncEngine so every importer
// (layouts, screens) works unchanged.

import { logger } from '../../lib/logger';

export type SyncEventType =
  | 'sync_start'
  | 'sync_success'
  | 'sync_error'
  | 'sync_skipped';

export interface SyncEvent {
  type: SyncEventType;
  failedCount?: number;
  error?: string;
}

const _listeners = new Set<(event: SyncEvent) => void>();

export function onSyncEvent(handler: (event: SyncEvent) => void): () => void {
  _listeners.add(handler);
  return () => _listeners.delete(handler);
}

function emit(event: SyncEvent): void {
  _listeners.forEach((fn) => fn(event));
}

/**
 * Web "sync": there is nothing to push/pull. Emit start+success so listeners
 * (hooks) re-read from Supabase. Always resolves true.
 */
export async function runSync(_ownerId: string): Promise<boolean> {
  emit({ type: 'sync_start' });
  // Yield once so the badge can render "Syncing…" before it clears.
  await Promise.resolve();
  emit({ type: 'sync_success', failedCount: 0 });
  logger.debug('[web] runSync: no-op (web writes go straight to Supabase)');
  return true;
}

/** Never syncing on web (runSync is synchronous-ish and has no lock). */
export function isSyncing(): boolean {
  return false;
}

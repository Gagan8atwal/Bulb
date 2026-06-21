// src/services/db/sqlite.web.ts
// WEB stub for the SQLite singleton.
//
// On web there is no local SQLite cache — the web data path (the *.web.ts repos)
// talks to Supabase directly, because the browser is online and supabase-js works
// natively on web. This file exists so that any module importing from
// `services/db/sqlite` on web (currently only useAuth's "sign out & clear data"
// path) resolves WITHOUT pulling expo-sqlite (and its OPFS/wasm requirements)
// into the web bundle.
//
// The native file (sqlite.ts) is untouched and remains the real implementation.

import { logger } from '../../lib/logger';

/**
 * Not used on web. Present only to satisfy the import surface.
 * If ever called, it throws loudly rather than failing silently.
 */
export async function getDb(): Promise<never> {
  throw new Error('[web] SQLite is not available on web. Web uses Supabase directly.');
}

/**
 * No-op on web. There is no local database to clear.
 */
export async function clearLocalDatabase(): Promise<void> {
  logger.debug('[web] clearLocalDatabase is a no-op (no local SQLite on web)');
}

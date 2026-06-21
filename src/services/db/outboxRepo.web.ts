// src/services/db/outboxRepo.web.ts
// WEB stub for the outbox repository.
//
// The outbox pattern exists to queue mutations while offline and replay them
// when connectivity returns — a native-mobile concern. On web the demo writes
// straight to Supabase, so there is no outbox. This stub keeps expo-sqlite out
// of the web bundle for any module importing from `services/db/outboxRepo`
// (currently only useAuth's "clear data" path imports `clearOutbox`).
//
// The native file (outboxRepo.ts) is untouched.

import { logger } from '../../lib/logger';

/**
 * No-op on web — there is no outbox to clear.
 */
export async function clearOutbox(): Promise<void> {
  logger.debug('[web] clearOutbox is a no-op (no outbox on web)');
}

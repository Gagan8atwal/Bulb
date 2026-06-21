// src/lib/id.ts
// All database row IDs are generated CLIENT-SIDE before any network call.
// This ensures:
//   1. Outbox items have stable IDs before reaching the server.
//   2. Upserts in pushOutbox are safe to retry (idempotent by ID).
//   3. UI can display items immediately without waiting for a server response.

import uuid from 'react-native-uuid';

/**
 * Generate a universally unique identifier (v4).
 * Safe for use as a Postgres UUID primary key.
 */
export function generateId(): string {
  return uuid.v4() as string;
}

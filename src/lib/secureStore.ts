// src/lib/secureStore.ts
// Chunked Keychain-backed storage adapter for expo-secure-store.
//
// WHY CHUNKING IS REQUIRED:
// expo-secure-store has a ~2048-byte per-value limit on iOS (Keychain constraint).
// Supabase session tokens (access + refresh JWTs) regularly exceed 2KB.
// Without chunking, session persistence silently fails and the user is logged out
// on every cold start.
//
// HOW IT WORKS:
// - Values ≤ CHUNK_SIZE are stored as a single key (fast path).
// - Larger values are split into chunks, stored as key__0, key__1, ...
//   with the count stored at key__count.
// - On read, chunks are reassembled in order.
// - On delete, all chunks + count key are removed atomically.

import * as ExpoSecureStore from 'expo-secure-store';
import { logger } from './logger';

const CHUNK_SIZE = 1800; // Conservative; leaves headroom under 2048

// ─── Internal helpers ─────────────────────────────────────────────────────────

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.substring(i, i + size));
  }
  return chunks;
}

function countKey(key: string): string {
  return `${key}__count`;
}

function chunkKey(key: string, index: number): string {
  return `${key}__${index}`;
}

// ─── Public adapter ───────────────────────────────────────────────────────────

async function getItem(key: string): Promise<string | null> {
  try {
    const chunkCountStr = await ExpoSecureStore.getItemAsync(countKey(key));

    if (chunkCountStr === null) {
      // No chunks → try reading as a single value
      return await ExpoSecureStore.getItemAsync(key);
    }

    const count = parseInt(chunkCountStr, 10);
    if (isNaN(count) || count <= 0) return null;

    let assembled = '';
    for (let i = 0; i < count; i++) {
      const chunk = await ExpoSecureStore.getItemAsync(chunkKey(key, i));
      if (chunk === null) {
        logger.warn(`SecureStore: missing chunk ${i}/${count} for key "${key}"`);
        return null;
      }
      assembled += chunk;
    }
    return assembled;
  } catch (err) {
    logger.error('SecureStore.getItem failed:', err);
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    if (value.length <= CHUNK_SIZE) {
      // Fast path: single write, clean up any stale chunks
      await ExpoSecureStore.setItemAsync(key, value);
      // Best-effort stale chunk cleanup (ignore errors)
      ExpoSecureStore.deleteItemAsync(countKey(key)).catch(() => undefined);
      return;
    }

    // Slow path: split into chunks
    const chunks = chunkString(value, CHUNK_SIZE);

    // Write count first so a partial write is detectable on read
    await ExpoSecureStore.setItemAsync(countKey(key), String(chunks.length));

    // Write chunks in parallel — order doesn't matter since we read by index
    await Promise.all(
      chunks.map((chunk, i) =>
        ExpoSecureStore.setItemAsync(chunkKey(key, i), chunk)
      )
    );
  } catch (err) {
    logger.error('SecureStore.setItem failed:', err);
    throw err; // Propagate so Supabase auth knows persistence failed
  }
}

async function removeItem(key: string): Promise<void> {
  try {
    const chunkCountStr = await ExpoSecureStore.getItemAsync(countKey(key));

    if (chunkCountStr !== null) {
      const count = parseInt(chunkCountStr, 10);
      const deletions: Promise<void>[] = [];
      for (let i = 0; i < count; i++) {
        deletions.push(ExpoSecureStore.deleteItemAsync(chunkKey(key, i)));
      }
      deletions.push(ExpoSecureStore.deleteItemAsync(countKey(key)));
      await Promise.all(deletions);
    }

    // Always attempt to delete the direct key (covers single-chunk case)
    await ExpoSecureStore.deleteItemAsync(key).catch(() => undefined);
  } catch (err) {
    logger.error('SecureStore.removeItem failed:', err);
  }
}

/**
 * Drop-in storage adapter for `createClient()`.
 * Usage: pass this as `auth.storage` in the Supabase client config.
 */
export const SecureStoreAdapter = {
  getItem,
  setItem,
  removeItem,
} as const;

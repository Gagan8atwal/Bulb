// src/lib/secureStore.web.ts
// WEB platform implementation of the storage adapter.
//
// Metro automatically resolves this file (instead of secureStore.ts) when
// bundling for web, because of the `.web.ts` extension. The native file is
// never touched.
//
// On native we use the iOS Keychain (chunked, because Supabase JWTs exceed the
// 2048-byte Keychain limit). On web there is no Keychain — we use localStorage,
// which is the standard, supported persistence layer for supabase-js on web.
// No chunking is needed (localStorage has no per-value size limit worth caring
// about here).
//
// SECURITY NOTE: localStorage is the same place supabase-js stores web sessions
// by default. RLS — not token secrecy — is what protects the data. The session
// token is scoped to the signed-in user and bounded by JWT expiry.

import { logger } from './logger';

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

async function getItem(key: string): Promise<string | null> {
  try {
    if (!hasWindow()) return null;
    return window.localStorage.getItem(key);
  } catch (err) {
    logger.error('secureStore.web.getItem failed:', err);
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    if (!hasWindow()) return;
    window.localStorage.setItem(key, value);
  } catch (err) {
    logger.error('secureStore.web.setItem failed:', err);
    throw err;
  }
}

async function removeItem(key: string): Promise<void> {
  try {
    if (!hasWindow()) return;
    window.localStorage.removeItem(key);
  } catch (err) {
    logger.error('secureStore.web.removeItem failed:', err);
  }
}

/**
 * Drop-in storage adapter for createClient(), web variant.
 * Same shape as the native SecureStoreAdapter.
 */
export const SecureStoreAdapter = {
  getItem,
  setItem,
  removeItem,
} as const;

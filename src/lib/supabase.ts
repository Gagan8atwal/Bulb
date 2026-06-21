// src/lib/supabase.ts
// Supabase client — single instance shared across the entire app.
//
// RULES:
//   1. This is the ONLY file that imports @supabase/supabase-js.
//   2. It uses SecureStoreAdapter (Keychain) — never AsyncStorage.
//   3. detectSessionInUrl: false — critical for native apps (no URL parsing).
//   4. No writes happen here. This is configuration only.
//
// IMPORTANT: process.env.EXPO_PUBLIC_* vars are inlined at build time by Metro.
// They are NOT secrets — the anon key is designed to be public, protected by RLS.

import { createClient } from '@supabase/supabase-js';
import { SecureStoreAdapter } from './secureStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loudly at startup rather than silently at runtime
  throw new Error(
    '[AL Command] Missing Supabase environment variables.\n' +
    'Create a .env file from .env.example and fill in your project credentials.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Keychain-backed chunked storage — handles tokens > 2048 bytes
    storage: SecureStoreAdapter,
    // Automatically refresh the access token before it expires
    autoRefreshToken: true,
    // Read and write session to storage on sign-in/sign-out
    persistSession: true,
    // MUST be false for native apps — there is no URL to parse on iOS
    detectSessionInUrl: false,
  },
});

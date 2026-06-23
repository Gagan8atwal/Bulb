// src/lib/supabase.ts
// Supabase client — single instance shared across the entire app.
//
// RULES:
//   1. This is the ONLY file that imports @supabase/supabase-js.
//   2. detectSessionInUrl: false on native (no URL to parse on iOS).
//      detectSessionInUrl: true on web (password-reset links must work).

import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SecureStoreAdapter } from './secureStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Warn loudly in dev if env vars are missing, but don't throw at module
// load time — a throw here crashes the entire React tree silently on web,
// producing a blank white screen with no visible error.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Bulb] Missing Supabase environment variables.\n' +
    'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

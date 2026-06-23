// src/lib/supabase.ts
// Supabase client for AL Command (Bulb).
//
// Three rules that must never change:
//   1. Use SecureStoreAdapter so sessions persist to the iOS Keychain on native
//      and localStorage on web (via secureStore.web.ts platform extension).
//   2. autoRefreshToken: true — keeps the session alive without user action.
//   3. detectSessionInUrl: false on native (no URL parsing on iOS).
//      detectSessionInUrl: true on web (password-reset links must work).

import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { SecureStoreAdapter } from './secureStore';
import { logger } from './logger';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
    'Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStoreAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

logger.debug('Supabase client initialised', { url: SUPABASE_URL });

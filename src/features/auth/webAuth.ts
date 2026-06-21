// src/features/auth/webAuth.ts
// Email/password auth for the WEB demo.
//
// This is the temporary, web-compatible auth path. It exists ALONGSIDE the
// native Apple Sign In (in useAuth.ts), which is fully preserved for the future
// iPhone build. Nothing here touches or weakens the native path.
//
// Successful auth updates the Supabase session; the onAuthStateChange listener
// wired in app/_layout.tsx (useAuthSetup) picks it up and index.tsx redirects to
// the app — identical to how the native flow completes.
//
// The same Supabase tables and RLS apply: a new email signup fires the
// handle_new_user trigger, which creates the public.users row, so RLS ownership
// works exactly as on native.

import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

export interface WebAuthResult {
  success: boolean;
  error?: string;
  /** True when a sign-up succeeded but email confirmation is required */
  needsConfirmation?: boolean;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<WebAuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      logger.warn('webAuth.signIn failed:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    logger.error('webAuth.signIn error:', message);
    return { success: false, error: message };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<WebAuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) {
      logger.warn('webAuth.signUp failed:', error.message);
      return { success: false, error: error.message };
    }
    // If email confirmation is enabled, there is no session yet.
    if (data.session === null) {
      return { success: true, needsConfirmation: true };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign up failed';
    logger.error('webAuth.signUp error:', message);
    return { success: false, error: message };
  }
}

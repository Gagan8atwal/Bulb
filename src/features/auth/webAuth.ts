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
  /** Friendly, user-facing message (already mapped from the raw Supabase error) */
  error?: string;
  /** Sign-up succeeded but the user must confirm their email before signing in */
  needsConfirmation?: boolean;
  /** Sign-up was rejected because the email already has an account */
  alreadyRegistered?: boolean;
  /** Sign-in was rejected because the email is registered but not yet confirmed */
  emailNotConfirmed?: boolean;
}

/**
 * Map raw Supabase auth error messages to friendly, actionable copy.
 * Returns the friendly string plus classification flags the UI can act on.
 */
function classifyAuthError(raw: string): {
  message: string;
  alreadyRegistered: boolean;
  emailNotConfirmed: boolean;
} {
  const m = raw.toLowerCase();

  if (m.includes('already registered') || m.includes('already been registered')) {
    return {
      message: 'This email already has an account — please sign in instead.',
      alreadyRegistered: true,
      emailNotConfirmed: false,
    };
  }
  if (m.includes('email not confirmed')) {
    return {
      message: 'Please confirm your email first. Check your inbox for the confirmation link.',
      alreadyRegistered: false,
      emailNotConfirmed: true,
    };
  }
  if (m.includes('invalid login credentials')) {
    return {
      message: 'Wrong email or password. Try again, or reset your password below.',
      alreadyRegistered: false,
      emailNotConfirmed: false,
    };
  }
  if (m.includes('invalid api key')) {
    return {
      message: 'Server configuration error (API key). Contact the administrator.',
      alreadyRegistered: false,
      emailNotConfirmed: false,
    };
  }
  // Fallback: surface the original message rather than hide it
  return { message: raw, alreadyRegistered: false, emailNotConfirmed: false };
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
      const c = classifyAuthError(error.message);
      return {
        success: false,
        error: c.message,
        emailNotConfirmed: c.emailNotConfirmed,
      };
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
      const c = classifyAuthError(error.message);
      return {
        success: false,
        error: c.message,
        alreadyRegistered: c.alreadyRegistered,
      };
    }
    // Supabase quirk: signing up an EXISTING confirmed email returns no error
    // but an empty identities array. Treat that as "already registered".
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        success: false,
        error: 'This email already has an account — please sign in instead.',
        alreadyRegistered: true,
      };
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

/**
 * Send a password-reset email through Supabase. The link in the email returns
 * the user to the app already authenticated (the web client has
 * detectSessionInUrl enabled), landing them on the Today screen.
 */
export async function sendPasswordReset(email: string): Promise<WebAuthResult> {
  try {
    const redirectTo =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) {
      logger.warn('webAuth.resetPassword failed:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send reset email';
    logger.error('webAuth.resetPassword error:', message);
    return { success: false, error: message };
  }
}

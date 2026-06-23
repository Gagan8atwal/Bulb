// src/features/auth/webAuth.ts
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';

export interface WebAuthResult {
  success: boolean;
  error?: string;
  needsConfirmation?: boolean;
  alreadyRegistered?: boolean;
  emailNotConfirmed?: boolean;
}

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
      const c = classifyAuthError(error.message);
      return { success: false, error: c.message, emailNotConfirmed: c.emailNotConfirmed };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
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
      const c = classifyAuthError(error.message);
      return { success: false, error: c.message, alreadyRegistered: c.alreadyRegistered };
    }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        success: false,
        error: 'This email already has an account — please sign in instead.',
        alreadyRegistered: true,
      };
    }
    if (data.session === null) {
      return { success: true, needsConfirmation: true };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign up failed';
    return { success: false, error: message };
  }
}

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
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not send reset email';
    return { success: false, error: message };
  }
}

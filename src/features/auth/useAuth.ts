// src/features/auth/useAuth.ts
// Auth hook — wraps Apple Sign In + Supabase + authStore.
//
// Usage: call useAuthSetup() ONCE in the root layout to wire up the session listener.
// All other components read from useAuthStore() directly.

import { useEffect, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../state/authStore';
import { clearLocalDatabase } from '../../services/db/sqlite';
import { clearOutbox } from '../../services/db/outboxRepo';
import { logger } from '../../lib/logger';

// ─── Sign in ──────────────────────────────────────────────────────────────────

export interface SignInResult {
  success: boolean;
  error?: string;
}

/**
 * Initiate Apple Sign In, exchange the identity token with Supabase.
 * The Supabase session is automatically persisted to Keychain via SecureStore.
 */
export async function signInWithApple(): Promise<SignInResult> {
  try {
    // 1. Request Apple credential — shows the native Apple sheet
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { success: false, error: 'No identity token received from Apple.' };
    }

    // 2. Exchange Apple identity token for a Supabase session
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      logger.error('signInWithApple: Supabase error:', error.message);
      return { success: false, error: error.message };
    }

    // 3. authStore is updated by the onAuthStateChange listener (set up in useAuthSetup)
    logger.debug('signInWithApple: success, user:', data.user?.id);
    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.message.includes('ERR_REQUEST_CANCELED')) {
      // User dismissed the Apple sheet — not an error
      return { success: false, error: 'cancelled' };
    }
    const message = err instanceof Error ? err.message : 'Sign in failed';
    logger.error('signInWithApple error:', message);
    return { success: false, error: message };
  }
}

// ─── Sign out ─────────────────────────────────────────────────────────────────

export interface SignOutOptions {
  /** If true, also wipe local SQLite (offered as "Sign out & clear data") */
  clearData?: boolean;
}

export async function signOut(options: SignOutOptions = {}): Promise<void> {
  await supabase.auth.signOut();
  // authStore.signOut() is called by the onAuthStateChange listener

  if (options.clearData) {
    await clearLocalDatabase();
    await clearOutbox();
    logger.debug('signOut: local data cleared');
  }
}

// ─── Root session listener — call once in app/_layout.tsx ────────────────────

/**
 * Set up the Supabase auth state listener and resolve the initial session.
 * Must be called ONCE at the root layout level.
 */
export function useAuthSetup(): void {
  const { setSession, setInitialized } = useAuthStore();

  useEffect(() => {
    // Resolve the persisted session (from Keychain) on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
      logger.debug('useAuthSetup: initial session resolved', !!session);
    });

    // Subscribe to future auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        logger.debug('onAuthStateChange:', _event);
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [setSession, setInitialized]);
}

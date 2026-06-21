// src/state/authStore.ts
// Auth state — session + biometric lock flag.
//
// RULES:
//   • This store is the single source of truth for "is the user authenticated?"
//   • The biometric lock is IN ADDITION to auth — the session may be valid but
//     the app may still be locked (e.g., returned from background).
//   • Never store the session in AsyncStorage — the Supabase client handles
//     persistence via SecureStore.

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  // The Supabase session. null = not signed in.
  session: Session | null;
  // True when the app is locked and requires biometric unlock.
  // Set to true on app background; cleared on successful Face ID.
  locked: boolean;
  // Whether the initial session check has completed (prevents flash of login screen)
  initialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setLocked: (locked: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  locked: false,
  initialized: false,

  setSession: (session) => set({ session }),
  setLocked: (locked) => set({ locked }),
  setInitialized: (initialized) => set({ initialized }),
  signOut: () => set({ session: null, locked: false }),
}));

// ─── Selectors ─────────────────────────────────────────────────────────────────

/** Convenience: returns the owner's auth.uid(), or null if not signed in. */
export function getOwnerId(): string | null {
  return useAuthStore.getState().session?.user?.id ?? null;
}

/** Convenience: returns the session's user id; throws if not signed in. */
export function requireOwnerId(): string {
  const id = getOwnerId();
  if (!id) throw new Error('No authenticated user');
  return id;
}

// src/features/auth/biometric.web.ts
// WEB stub for biometric (Face ID) auth.
//
// expo-local-authentication has no meaningful web implementation. On web there
// is no Face ID, so the lock gate is simply skipped: getBiometricCapability()
// returns shouldLock = false, which makes (app)/_layout render the app without a
// lock screen. The Supabase session (persisted in localStorage) is the
// protection on web. authenticateWithBiometric() is never called when
// shouldLock is false, but is provided for interface completeness.

import type { BiometricCapability, BiometricResult } from './biometric';

export async function getBiometricCapability(): Promise<BiometricCapability> {
  return {
    hasHardware: false,
    isEnrolled: false,
    shouldLock: false, // → no lock screen on web; session alone gates
  };
}

export async function authenticateWithBiometric(): Promise<BiometricResult> {
  // Never reached on web (shouldLock is false), but safe to call.
  return { success: true };
}

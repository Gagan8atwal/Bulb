// src/features/auth/biometric.ts
// Face ID (biometric) helpers.
//
// BEHAVIOR:
//   • If Face ID is enrolled: require biometric unlock on cold start and resume.
//   • If not enrolled or hardware unavailable: skip the gate (session alone gates).
//   • 3 failures: caller should surface Retry + Sign Out options.
//
// NOTE: expo-local-authentication supports Face ID, Touch ID, and device passcode.
// On iPhone (Face ID device), it will use Face ID automatically.

import * as LocalAuthentication from 'expo-local-authentication';
import { logger } from '../../lib/logger';

export interface BiometricCapability {
  hasHardware: boolean;
  isEnrolled: boolean;
  /** True if the app should enforce biometric on resume */
  shouldLock: boolean;
}

/**
 * Check whether the device supports biometric auth and has it set up.
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = hasHardware
    ? await LocalAuthentication.isEnrolledAsync()
    : false;

  return {
    hasHardware,
    isEnrolled,
    shouldLock: isEnrolled, // Only lock if enrolled; otherwise fallback to session
  };
}

export interface BiometricResult {
  success: boolean;
  error?: 'cancelled' | 'failed' | 'lockout' | 'unknown';
}

/**
 * Prompt the user for biometric authentication.
 * Returns success=true if authenticated, false with an error code otherwise.
 */
export async function authenticateWithBiometric(): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock AL Command',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false, // Allow device passcode as fallback
      cancelLabel: 'Cancel',
    });

    if (result.success) {
      return { success: true };
    }

    // Map expo's error codes to our internal codes
    switch (result.error) {
      case 'user_cancel':
      case 'system_cancel':
        return { success: false, error: 'cancelled' };
      case 'lockout':
      case 'lockout_permanent':
        return { success: false, error: 'lockout' };
      case 'authentication_failed':
      case 'not_enrolled':
      default:
        return { success: false, error: 'failed' };
    }
  } catch (err) {
    logger.error('biometric.authenticate error:', err);
    return { success: false, error: 'unknown' };
  }
}

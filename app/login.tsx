// app/login.tsx
// Login screen. Single action: Sign in with Apple.
//
// UX rules:
//   • No email/password — Apple Sign In only in Sprint 1.
//   • Error messages are inline, not a modal or toast.
//   • Loading replaces the button (user can't double-tap).
//   • Successful sign-in is handled by the auth listener in _layout.tsx,
//     which updates the session → index.tsx redirects to /(app)/today.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SignIn } from '../src/features/auth/SignIn';
import { LoadingState } from '../src/components/LoadingState';
import { colors } from '../src/theme/colors';
import { spacing, typography } from '../src/theme/spacing';
import { useAuthStore } from '../src/state/authStore';

export default function LoginScreen(): React.ReactElement {
  const [signInError, setSignInError] = useState<string | null>(null);
  const initialized = useAuthStore((s) => s.initialized);

  // Show a full-screen spinner while we check for a persisted session
  // (avoids a flash of the login screen for users who are already signed in)
  if (!initialized) {
    return (
      <View style={styles.splash}>
        <LoadingState />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* ── Brand ─────────────────────────────────────────────────── */}
        <View style={styles.brand}>
          <Text style={styles.wordmark}>AL</Text>
          <Text style={styles.tagline}>Your personal AI operating system</Text>
        </View>

        {/* ── Sign in ───────────────────────────────────────────────── */}
        <View style={styles.signIn}>
          {signInError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{signInError}</Text>
            </View>
          )}
          <SignIn
            onSuccess={() => {
              // Auth listener in _layout.tsx handles the redirect
              setSignInError(null);
            }}
            onError={(msg) => setSignInError(msg)}
          />
          <Text style={styles.legal}>
            By signing in you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  wordmark: {
    fontSize: 72,
    fontWeight: typography.weight.bold,
    color: colors.accent,
    letterSpacing: -2,
  },
  tagline: {
    fontSize: typography.size.base,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  signIn: {
    gap: spacing.md,
  },
  errorBanner: {
    backgroundColor: colors.destructiveLight,
    borderRadius: 10,
    padding: spacing.md,
  },
  errorText: {
    fontSize: typography.size.sm,
    color: colors.destructive,
    textAlign: 'center',
  },
  legal: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: typography.size.xs * 1.6,
  },
});

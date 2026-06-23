// app/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
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
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Text style={styles.wordmark}>AL</Text>
            <View style={styles.accentRule} />
            <Text style={styles.tagline}>Your personal AI operating system</Text>
          </View>

          <View style={styles.form}>
            {signInError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{signInError}</Text>
              </View>
            )}
            <SignIn
              onSuccess={() => setSignInError(null)}
              onError={(msg) => setSignInError(msg)}
            />
            <Text style={styles.legal}>
              By continuing you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  wordmark: {
    fontSize: 64,
    fontWeight: typography.weight.bold,
    color: colors.accent,
    letterSpacing: -1.5,
  },
  accentRule: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: spacing.md,
    opacity: 0.9,
  },
  tagline: {
    fontSize: typography.size.md,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: spacing.md,
  },
  form: { gap: spacing.md, paddingBottom: spacing.xl },
  errorBanner: {
    backgroundColor: colors.destructiveLight,
    borderRadius: 12,
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
    marginTop: spacing.sm,
  },
});

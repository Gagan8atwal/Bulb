import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { SignIn } from '../src/features/auth/SignIn';
import { LoadingState } from '../src/components/LoadingState';
import { colors } from '../src/theme/colors';
import { spacing, typography } from '../src/theme/spacing';
import { useAuthStore } from '../src/state/authStore';

export default function LoginScreen(): React.ReactElement {
  const [error, setError] = useState<string | null>(null);
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized) {
    return <View style={s.fill}><LoadingState /></View>;
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.inner}>
        <Text style={s.wordmark}>AL</Text>
        <Text style={s.tag}>Your personal AI operating system</Text>
        {error && <Text style={s.err}>{error}</Text>}
        <SignIn onSuccess={() => setError(null)} onError={setError} />
        <Text style={s.legal}>By continuing you agree to our Terms of Service.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1, backgroundColor: colors.background },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  wordmark: {
    fontSize: 48,
    fontWeight: typography.weight.bold,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  tag: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  err: {
    fontSize: typography.size.sm,
    color: colors.destructive,
    textAlign: 'center',
  },
  legal: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

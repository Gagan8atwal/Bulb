// src/features/auth/SignIn.web.tsx
// WEB sign-in surface for the login screen: email + password, with a toggle
// between "Sign in" and "Create account". Same Props contract as SignIn.tsx, so
// login.tsx renders <SignIn> and doesn't care which platform variant is used.
//
// This is the temporary web demo auth. Apple Sign In remains the native path.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { z } from 'zod';
import { signInWithEmail, signUpWithEmail } from './webAuth';
import { colors } from '../../theme/colors';
import { spacing, typography, radius } from '../../theme/spacing';

interface Props {
  onSuccess: () => void;
  onError?: (message: string) => void;
}

const credsSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type Mode = 'signin' | 'signup';

export function SignIn({ onSuccess, onError }: Props): React.ReactElement {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    setLocalError(null);
    setInfo(null);

    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setLocalError(parsed.error.errors[0]?.message ?? 'Invalid input');
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === 'signin'
          ? await signInWithEmail(parsed.data.email, parsed.data.password)
          : await signUpWithEmail(parsed.data.email, parsed.data.password);

      if (result.success) {
        if (result.needsConfirmation) {
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signin');
        } else {
          onSuccess(); // session listener in _layout handles the redirect
        }
      } else {
        setLocalError(result.error ?? 'Authentication failed');
        onError?.(result.error ?? 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  return (
    <View style={styles.container}>
      <TextInput
        value={email}
        onChangeText={(t) => { setEmail(t); if (localError) setLocalError(null); }}
        placeholder="Email"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        inputMode="email"
        selectionColor={colors.accent}
        style={styles.input}
        accessibilityLabel="Email"
      />
      <TextInput
        value={password}
        onChangeText={(t) => { setPassword(t); if (localError) setLocalError(null); }}
        placeholder="Password"
        placeholderTextColor={colors.textTertiary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={colors.accent}
        style={styles.input}
        accessibilityLabel="Password"
        onSubmitEditing={handleSubmit}
      />

      {localError && <Text style={styles.error}>{localError}</Text>}
      {info && <Text style={styles.info}>{info}</Text>}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={mode === 'signin' ? 'Sign in' : 'Create account'}
      >
        {loading ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={styles.primaryBtnText}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setLocalError(null); setInfo(null); }}
        style={styles.toggle}
        accessibilityRole="button"
      >
        <Text style={styles.toggleText}>
          {mode === 'signin'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    minHeight: 50,
  },
  error: {
    fontSize: typography.size.sm,
    color: colors.destructive,
    textAlign: 'center',
  },
  info: {
    fontSize: typography.size.sm,
    color: colors.success,
    textAlign: 'center',
  },
  primaryBtn: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textInverse,
  },
  toggle: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleText: {
    fontSize: typography.size.sm,
    color: colors.accent,
  },
});

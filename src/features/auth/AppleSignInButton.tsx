// src/features/auth/AppleSignInButton.tsx
// Native Apple Sign In button.
// Uses expo-apple-authentication's AppleAuthenticationButton for App Store compliance.
// (Apple requires the official button; custom styled buttons are rejected in review.)

import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { signInWithApple } from './useAuth';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/spacing';

interface Props {
  onSuccess: () => void;
  onError?: (message: string) => void;
}

export function AppleSignInButton({ onSuccess, onError }: Props): React.ReactElement {
  const [loading, setLoading] = useState(false);

  async function handlePress(): Promise<void> {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithApple();
      if (result.success) {
        onSuccess();
      } else if (result.error && result.error !== 'cancelled') {
        onError?.(result.error);
      }
      // 'cancelled' is silent — user dismissed the sheet intentionally
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={12}
        style={styles.button}
        onPress={handlePress}
      />
      {loading && (
        <Text style={styles.loadingText}>Signing in…</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    width: '100%',
    height: 54,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
  },
});

// app/capture.tsx
// Modal capture screen — the primary daily action in AL Command.
//
// Accessed via: router.push('/capture') or router.push('/capture?projectId=...')
// Presented as: presentation: 'modal' (slide-from-bottom, defined in _layout.tsx)
//
// Responsibilities:
//   • Render CaptureInput (text + voice + project picker + type toggle)
//   • Handle Cancel (with discard confirmation if text is present)
//   • Handle Save → dismiss modal
//
// The actual save logic lives in useCapture (which calls projectsRepo or memoryRepo).
// Nothing in this file touches the database or network directly.

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { CaptureInput } from '../src/features/capture/CaptureInput';
import { colors } from '../src/theme/colors';
import { spacing, typography } from '../src/theme/spacing';

export default function CaptureScreen(): React.ReactElement {
  // Optional: pre-select project if launched from Project Detail
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();

  // Track whether the user has typed anything (for discard confirmation)
  // Updated by CaptureInput via onTextChange callback
  const hasText = useRef(false);

  const handleSaved = useCallback((): void => {
    router.back();
  }, []);

  const handleCancel = useCallback((): void => {
    if (hasText.current) {
      Alert.alert(
        'Discard capture?',
        'Your text will not be saved.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Capture</Text>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel capture"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Core capture UI */}
        <CaptureInput
          initialProjectId={projectId ?? null}
          onSaved={handleSaved}
          onCancel={handleCancel}
          onTextChange={(text) => { hasText.current = text.length > 0; }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  kav: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  cancelBtn: {
    padding: spacing.sm,
  },
  cancelText: {
    fontSize: typography.size.base,
    color: colors.accent,
  },
});

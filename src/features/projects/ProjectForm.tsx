// src/features/projects/ProjectForm.tsx
// Modal form for creating or renaming a project.
// Uses React Native Modal (no library) to keep dependencies minimal for Sprint 1.

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { colors } from '../../theme/colors';
import { spacing, typography, radius } from '../../theme/spacing';

const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 characters or less'),
});

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  /** Pre-fill the field when renaming an existing project */
  initialName?: string;
  title?: string;
}

export function ProjectForm({
  visible,
  onClose,
  onSave,
  initialName = '',
  title = 'New project',
}: Props): React.ReactElement {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Reset state each time the modal opens
  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
      // Small delay so the modal animation completes before focusing
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, initialName]);

  async function handleSave(): Promise<void> {
    const result = projectSchema.safeParse({ name });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? 'Invalid name');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(result.data.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Dim overlay — tap to dismiss */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>{title}</Text>

          <TextInput
            ref={inputRef}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (error) setError(null);
            }}
            placeholder="Project name"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            maxLength={120}
            selectionColor={colors.accent}
            style={[styles.input, error ? styles.inputError : undefined]}
            accessibilityLabel="Project name"
          />

          {/* Character count + error */}
          <View style={styles.inputFooter}>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <View />
            )}
            <Text style={[styles.countText, name.length > 100 && styles.countWarn]}>
              {name.length}/120
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              label="Cancel"
              onPress={onClose}
              variant="ghost"
              style={styles.actionBtn}
            />
            <Button
              label="Save"
              onPress={handleSave}
              variant="primary"
              loading={saving}
              disabled={name.trim().length === 0}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.size.md,
    color: colors.textPrimary,
    height: 52,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 16,
  },
  errorText: {
    fontSize: typography.size.xs,
    color: colors.destructive,
  },
  countText: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  countWarn: {
    color: colors.warning,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
});

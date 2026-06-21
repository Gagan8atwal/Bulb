// src/features/tasks/TaskForm.tsx
// Inline task creation row used inside Project Detail.
// The full Capture screen (modal) handles voice + project picker.
// This form is the quick-add shortcut for "add a task to THIS project".

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { z } from 'zod';
import { colors } from '../../theme/colors';
import { spacing, typography, radius } from '../../theme/spacing';

const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Task title is required')
    .max(280, 'Title must be 280 characters or less'),
});

interface Props {
  onSave: (title: string) => Promise<void>;
  placeholder?: string;
}

export function TaskForm({
  onSave,
  placeholder = 'Add a task…',
}: Props): React.ReactElement {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  async function handleSubmit(): Promise<void> {
    const result = taskSchema.safeParse({ title });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? 'Invalid title');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(result.data.title);
      setTitle('');
      inputRef.current?.blur();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const canSave = title.trim().length > 0 && !saving;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.addIcon}>
          <Text style={styles.addIconText}>+</Text>
        </View>
        <TextInput
          ref={inputRef}
          value={title}
          onChangeText={(t) => {
            setTitle(t);
            if (error) setError(null);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          maxLength={280}
          selectionColor={colors.accent}
          style={styles.input}
          accessibilityLabel="New task title"
        />
        {canSave && (
          <TouchableOpacity
            onPress={handleSubmit}
            style={styles.saveBtn}
            accessibilityRole="button"
            accessibilityLabel="Add task"
          >
            <Text style={styles.saveBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addIcon: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIconText: {
    fontSize: typography.size.base,
    color: colors.textTertiary,
    lineHeight: 20,
  },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
  saveBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  saveBtnText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textInverse,
  },
  errorText: {
    fontSize: typography.size.xs,
    color: colors.destructive,
    marginTop: 2,
    marginLeft: spacing.xl,
  },
});

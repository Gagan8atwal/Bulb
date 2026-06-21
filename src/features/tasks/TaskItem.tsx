// src/features/tasks/TaskItem.tsx
// Single task row. Displays title, source badge, and done toggle.
// Presentational — all actions go through callbacks from the parent hook.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Task } from '../../types/models';
import { colors } from '../../theme/colors';
import { spacing, typography, radius } from '../../theme/spacing';
import { formatRelative } from '../../lib/time';

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TaskItem({ task, onToggle, onDelete }: Props): React.ReactElement {
  const isDone = task.status === 'done';

  function handleDelete(): void {
    Alert.alert(
      'Delete task?',
      task.title,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(task.id),
        },
      ]
    );
  }

  return (
    <TouchableOpacity
      onLongPress={onDelete ? handleDelete : undefined}
      activeOpacity={0.85}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Task: ${task.title}${isDone ? ', done' : ''}`}
      accessibilityHint={onDelete ? 'Hold to delete' : undefined}
    >
      {/* Done toggle */}
      <TouchableOpacity
        onPress={() => onToggle(task.id)}
        style={[styles.circle, isDone && styles.circleDone]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityLabel={isDone ? 'Mark as todo' : 'Mark as done'}
        accessibilityState={{ checked: isDone }}
      >
        {isDone && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.title, isDone && styles.titleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{formatRelative(task.created_at)}</Text>
          {task.source === 'voice' && (
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>🎤 voice</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
    minHeight: 56,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2, // Align with first text line
    flexShrink: 0,
  },
  circleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: typography.weight.bold,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: typography.size.base,
    color: colors.textPrimary,
    lineHeight: typography.size.base * 1.4,
  },
  titleDone: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  sourceBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  sourceBadgeText: {
    fontSize: typography.size.xs,
    color: colors.accent,
  },
});

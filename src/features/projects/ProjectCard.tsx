// src/features/projects/ProjectCard.tsx
// Project row in the projects list.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Project } from '../../types/models';
import { colors } from '../../theme/colors';
import { spacing, typography, radius } from '../../theme/spacing';

interface Props {
  project: Project;
  openTaskCount?: number;
  onPress: () => void;
  onArchive: () => void;
}

export function ProjectCard({
  project,
  openTaskCount = 0,
  onPress,
  onArchive,
}: Props): React.ReactElement {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onArchive}
      activeOpacity={0.75}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${project.name}, ${openTaskCount} open tasks`}
      accessibilityHint="Hold to archive"
    >
      <View style={styles.indicator} />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {project.name}
        </Text>
        {openTaskCount > 0 && (
          <Text style={styles.taskCount}>
            {openTaskCount} open {openTaskCount === 1 ? 'task' : 'tasks'}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  indicator: {
    width: 3,
    height: 32,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    marginLeft: spacing.sm,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
  },
  taskCount: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
  },
  chevron: {
    fontSize: typography.size.xl,
    color: colors.textTertiary,
  },
});

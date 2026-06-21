// app/(app)/project/[id].tsx
// Project Detail screen.
//
// Two sections:
//   • Tasks — list with toggle/delete + quick inline add
//   • Notes — list of captured notes
//
// The + FAB opens the Capture modal pre-scoped to this project.
// Long-press the project name to rename it.

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useTasks } from '../../../src/features/tasks/useTasks';
import { TaskItem } from '../../../src/features/tasks/TaskItem';
import { TaskForm } from '../../../src/features/tasks/TaskForm';
import { useProjects } from '../../../src/features/projects/useProjects';
import { ProjectForm } from '../../../src/features/projects/ProjectForm';
import { EmptyState } from '../../../src/components/EmptyState';
import { LoadingState } from '../../../src/components/LoadingState';
import { ErrorState } from '../../../src/components/ErrorState';
import { ListRow } from '../../../src/components/ListRow';
import { useAuthStore } from '../../../src/state/authStore';
import { listNotesByProject } from '../../../src/services/db/memoryRepo';
import { runSync } from '../../../src/services/sync/syncEngine';
import { MemoryItem, Task } from '../../../src/types/models';
import { colors } from '../../../src/theme/colors';
import { spacing, typography } from '../../../src/theme/spacing';

export default function ProjectDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const ownerId = session?.user?.id;

  const { projects, rename } = useProjects();
  const project = projects.find((p) => p.id === id);

  const { tasks, loading, error, refresh, addTask, toggle, remove } = useTasks({
    projectId: id ?? null,
  });

  const [notes, setNotes] = useState<MemoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showRenameForm, setShowRenameForm] = useState(false);

  // Load notes for this project
  useEffect(() => {
    if (!ownerId || !id) return;
    listNotesByProject(ownerId, id).then(setNotes).catch(() => undefined);
  }, [ownerId, id, tasks]); // re-load notes when tasks change (after sync)

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    if (ownerId) await runSync(ownerId);
    await refresh();
    if (ownerId && id) {
      const fresh = await listNotesByProject(ownerId, id);
      setNotes(fresh);
    }
    setRefreshing(false);
  }, [ownerId, id, refresh]);

  const handleToggle = (taskId: string): void => {
    toggle(taskId).catch(() =>
      Alert.alert('Error', 'Could not update task.')
    );
  };

  const handleDeleteTask = (taskId: string): void => {
    remove(taskId).catch(() =>
      Alert.alert('Error', 'Could not delete task.')
    );
  };

  const handleAddTask = async (title: string): Promise<void> => {
    await addTask({ title, source: 'manual', project_id: id });
  };

  const handleRename = async (name: string): Promise<void> => {
    if (!id) return;
    await rename(id, name);
  };

  const openCapture = (): void => {
    // Pass the project ID as a query param so Capture pre-selects it
    router.push({ pathname: '/capture', params: { projectId: id } });
  };

  if (!id) {
    return (
      <SafeAreaView style={styles.screen}>
        <ErrorState message="Project not found." onRetry={() => router.back()} />
      </SafeAreaView>
    );
  }

  if (loading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header
          name={project?.name ?? '…'}
          onBack={() => router.back()}
          onRename={() => setShowRenameForm(true)}
        />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header
          name={project?.name ?? 'Project'}
          onBack={() => router.back()}
          onRename={() => setShowRenameForm(true)}
        />
        <ErrorState message={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  // SectionList data: two sections
  type SectionItem = Task | MemoryItem | 'task_form';
  const sections: Array<{ title: string; data: SectionItem[] }> = [
    {
      title: 'Tasks',
      data: ['task_form' as const, ...tasks],
    },
    {
      title: 'Notes',
      data: notes,
    },
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <Header
        name={project?.name ?? 'Project'}
        onBack={() => router.back()}
        onRename={() => setShowRenameForm(true)}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => {
          if (item === 'task_form') return '__task_form__';
          return (item as Task | MemoryItem).id;
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item, section }) => {
          if (item === 'task_form') {
            return <TaskForm onSave={handleAddTask} />;
          }
          if (section.title === 'Tasks') {
            const task = item as Task;
            return (
              <TaskItem
                task={task}
                onToggle={handleToggle}
                onDelete={handleDeleteTask}
              />
            );
          }
          const note = item as MemoryItem;
          return (
            <ListRow
              title={note.content}
              subtitle={new Date(note.created_at).toLocaleDateString()}
              showChevron={false}
            />
          );
        }}
        renderSectionFooter={({ section }) => {
          if (section.title === 'Tasks' && tasks.length === 0) {
            return (
              <Text style={styles.emptySection}>
                No tasks yet — add one above or tap +
              </Text>
            );
          }
          if (section.title === 'Notes' && notes.length === 0) {
            return (
              <Text style={styles.emptySection}>
                No notes yet — capture one with +
              </Text>
            );
          }
          return null;
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        stickySectionHeadersEnabled={false}
      />

      {/* FAB — opens Capture pre-scoped to this project */}
      <TouchableOpacity
        onPress={openCapture}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Capture task or note for this project"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Rename modal */}
      <ProjectForm
        visible={showRenameForm}
        onClose={() => setShowRenameForm(false)}
        onSave={handleRename}
        initialName={project?.name ?? ''}
        title="Rename project"
      />
    </SafeAreaView>
  );
}

function Header({
  name,
  onBack,
  onRename,
}: {
  name: string;
  onBack: () => void;
  onRename: () => void;
}): React.ReactElement {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Back to projects"
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onLongPress={onRename}
        style={styles.nameTouchable}
        accessibilityRole="button"
        accessibilityLabel={`Project: ${name}`}
        accessibilityHint="Hold to rename"
      >
        <Text style={styles.projectName} numberOfLines={1}>
          {name}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  backIcon: {
    fontSize: typography.size.xxl,
    color: colors.accent,
    fontWeight: typography.weight.regular,
  },
  nameTouchable: {
    flex: 1,
  },
  projectName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emptySection: {
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.textInverse,
    lineHeight: 32,
  },
});

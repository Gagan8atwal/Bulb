// app/(app)/projects.tsx
// Projects list screen.
//
// Shows all active projects with their open task count.
// Tap to open Project Detail.
// Long-press to archive (with confirmation).
// + button opens ProjectForm to create a new project.

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

import { useProjects } from '../../src/features/projects/useProjects';
import { ProjectCard } from '../../src/features/projects/ProjectCard';
import { ProjectForm } from '../../src/features/projects/ProjectForm';
import { SyncBadge } from '../../src/components/SyncBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { ErrorState } from '../../src/components/ErrorState';
import { runSync } from '../../src/services/sync/syncEngine';
import { useAuthStore } from '../../src/state/authStore';
import { countOpenTasksByProject } from '../../src/services/db/tasksRepo';
import { Project } from '../../src/types/models';
import { colors } from '../../src/theme/colors';
import { spacing, typography } from '../../src/theme/spacing';

export default function ProjectsScreen(): React.ReactElement {
  const session = useAuthStore((s) => s.session);
  const { projects, loading, error, refresh, addProject, archive } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  // Load open task counts for each project
  useEffect(() => {
    if (!session?.user?.id || projects.length === 0) return;
    const ownerId = session.user.id;

    Promise.all(
      projects.map(async (p) => ({
        id: p.id,
        count: await countOpenTasksByProject(ownerId, p.id),
      }))
    ).then((results) => {
      const map: Record<string, number> = {};
      results.forEach((r) => { map[r.id] = r.count; });
      setTaskCounts(map);
    }).catch(() => undefined);
  }, [projects, session?.user?.id]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    if (session?.user?.id) await runSync(session.user.id);
    await refresh();
    setRefreshing(false);
  }, [session, refresh]);

  const handleArchive = useCallback((project: Project): void => {
    Alert.alert(
      'Archive project?',
      `"${project.name}" will be archived and removed from this list.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            archive(project.id).catch(() =>
              Alert.alert('Error', 'Could not archive project.')
            );
          },
        },
      ]
    );
  }, [archive]);

  const handleOpenProject = useCallback((id: string): void => {
    router.push(`/(app)/project/${id}`);
  }, []);

  const handleSaveProject = useCallback(async (name: string): Promise<void> => {
    await addProject({ name });
  }, [addProject]);

  if (loading && projects.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onAdd={() => setShowForm(true)} />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && projects.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header onAdd={() => setShowForm(true)} />
        <ErrorState message={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  const activeProjects = projects.filter((p) => p.status === 'active');

  return (
    <SafeAreaView style={styles.screen}>
      <Header onAdd={() => setShowForm(true)} />

      <FlatList<Project>
        data={activeProjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            openTaskCount={taskCounts[item.id] ?? 0}
            onPress={() => handleOpenProject(item.id)}
            onArchive={() => handleArchive(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📁"
            title="No projects yet"
            subtitle="Tap + to create your first project."
            actionLabel="New project"
            onAction={() => setShowForm(true)}
          />
        }
        contentContainerStyle={activeProjects.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      />

      <ProjectForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveProject}
        title="New project"
      />
    </SafeAreaView>
  );
}

function Header({ onAdd }: { onAdd: () => void }): React.ReactElement {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Projects</Text>
      <View style={styles.headerRight}>
        <SyncBadge />
        <TouchableOpacity
          onPress={onAdd}
          style={styles.addBtn}
          accessibilityRole="button"
          accessibilityLabel="New project"
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 22,
    color: colors.textInverse,
    fontWeight: typography.weight.regular,
    lineHeight: 26,
  },
  emptyContainer: {
    flex: 1,
  },
});

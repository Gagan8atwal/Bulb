// app/(app)/today.tsx
// Today screen — home tab.
//
// Shows all open (status='todo') tasks across every project, newest-first.
// Pull-to-refresh triggers a sync cycle.
// The + FAB opens the Capture modal.

import React, { useState, useCallback } from 'react';
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

import { useTasks } from '../../src/features/tasks/useTasks';
import { TaskItem } from '../../src/features/tasks/TaskItem';
import { SyncBadge } from '../../src/components/SyncBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { ErrorState } from '../../src/components/ErrorState';
import { runSync } from '../../src/services/sync/syncEngine';
import { useAuthStore } from '../../src/state/authStore';
import { Task } from '../../src/types/models';
import { colors } from '../../src/theme/colors';
import { spacing, typography } from '../../src/theme/spacing';

export default function TodayScreen(): React.ReactElement {
  const session = useAuthStore((s) => s.session);
  const { tasks, loading, error, refresh, toggle, remove } = useTasks();
  const [refreshing, setRefreshing] = useState(false);

  // Only show open tasks on the Today screen
  const openTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    if (session?.user?.id) {
      await runSync(session.user.id);
    }
    await refresh();
    setRefreshing(false);
  }, [session, refresh]);

  const handleToggle = useCallback((id: string): void => {
    toggle(id).catch(() => {
      Alert.alert('Error', 'Could not update task. Try again.');
    });
  }, [toggle]);

  const handleDelete = useCallback((id: string): void => {
    remove(id).catch(() => {
      Alert.alert('Error', 'Could not delete task. Try again.');
    });
  }, [remove]);

  const openCapture = (): void => {
    router.push('/capture');
  };

  if (loading && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header openCapture={openCapture} />
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header openCapture={openCapture} />
        <ErrorState message={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header openCapture={openCapture} />

      <FlatList<Task>
        data={openTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="✅"
            title="All clear"
            subtitle="Nothing open. Tap + to capture a new task."
            actionLabel="Capture"
            onAction={openCapture}
          />
        }
        ListFooterComponent={
          doneTasks.length > 0 ? (
            <Text style={styles.doneLabel}>
              {doneTasks.length} completed today
            </Text>
          ) : null
        }
        contentContainerStyle={openTasks.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={openCapture}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Capture new task or note"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Header({ openCapture }: { openCapture: () => void }): React.ReactElement {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Today</Text>
      <View style={styles.headerRight}>
        <SyncBadge />
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
  emptyContainer: {
    flex: 1,
  },
  doneLabel: {
    fontSize: typography.size.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl + spacing.md, // Above tab bar
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
    fontWeight: typography.weight.regular,
  },
});

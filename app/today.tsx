import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, TouchableOpacity, RefreshControl, Alert,
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
import { signOut } from '../../src/features/auth/useAuth';
import { Task } from '../../src/types/models';
import { colors } from '../../src/theme/colors';
import { spacing, typography, radius } from '../../src/theme/spacing';

export default function TodayScreen(): React.ReactElement {
  const session = useAuthStore((s) => s.session);
  const { tasks, loading, error, refresh, toggle, remove } = useTasks();
  const [refreshing, setRefreshing] = useState(false);

  const openTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    if (session?.user?.id) await runSync(session.user.id);
    await refresh();
    setRefreshing(false);
  }, [session, refresh]);

  const handleToggle = useCallback((id: string): void => {
    toggle(id).catch(() => Alert.alert('Error', 'Could not update task.'));
  }, [toggle]);

  const handleDelete = useCallback((id: string): void => {
    remove(id).catch(() => Alert.alert('Error', 'Could not delete task.'));
  }, [remove]);

  const openCapture = (): void => { router.push('/capture'); };

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
          <TaskItem task={item} onToggle={handleToggle} onDelete={handleDelete} />
        )}
        ListEmptyComponent={
          <EmptyState icon="✅" title="All clear"
            subtitle="Nothing open. Tap + to capture a new task."
            actionLabel="Capture" onAction={openCapture} />
        }
        ListFooterComponent={
          doneTasks.length > 0
            ? <Text style={styles.doneLabel}>{doneTasks.length} completed today</Text>
            : null
        }
        contentContainerStyle={openTasks.length === 0 ? styles.emptyContainer : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={colors.accent} />
        }
      />
      <TouchableOpacity onPress={openCapture} style={styles.fab}
        accessibilityRole="button" accessibilityLabel="Capture new task">
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function Header({ openCapture }: { openCapture: () => void }): React.ReactElement {
  const session = useAuthStore((s) => s.session);
  const email = session?.user?.email ?? '';
  const initial = (email.charAt(0) || 'A').toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = useCallback(async (): Promise<void> => {
    setMenuOpen(false);
    await signOut();
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Today</Text>
        <Text style={styles.headerDate}>{today}</Text>
      </View>
      <View style={styles.headerRight}>
        <SyncBadge />
        <TouchableOpacity onPress={() => setMenuOpen((v) => !v)}
          style={styles.avatar} accessibilityRole="button">
          <Text style={styles.avatarText}>{initial}</Text>
        </TouchableOpacity>
      </View>
      {menuOpen && (
        <View style={styles.menu}>
          <Text style={styles.menuEmail} numberOfLines={1}>{email || 'Signed in'}</Text>
          <View style={styles.menuDivider} />
          <TouchableOpacity onPress={handleSignOut} style={styles.menuItem}
            accessibilityRole="button">
            <Text style={styles.menuItemText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, zIndex: 10 },
  headerLeft: { flexShrink: 1 },
  headerTitle: { fontSize: typography.size.display, fontWeight: typography.weight.bold,
    color: colors.textPrimary },
  headerDate: { fontSize: typography.size.sm, color: colors.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentLight,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: typography.size.sm, fontWeight: typography.weight.semibold,
    color: colors.accent },
  menu: { position: 'absolute', top: 62, right: spacing.md, minWidth: 220,
    backgroundColor: colors.surfaceElevated, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.xs, zIndex: 100 },
  menuEmail: { fontSize: typography.size.sm, color: colors.textSecondary,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  menuDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  menuItem: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  menuItemText: { fontSize: typography.size.base, fontWeight: typography.weight.medium,
    color: colors.destructive },
  emptyContainer: { flex: 1 },
  doneLabel: { fontSize: typography.size.sm, color: colors.textTertiary,
    textAlign: 'center', paddingVertical: spacing.lg },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl + spacing.md,
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabIcon: { fontSize: 28, color: colors.textInverse, lineHeight: 32 },
});

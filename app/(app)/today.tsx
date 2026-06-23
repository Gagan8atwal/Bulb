// app/(app)/today.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTasks } from '../../src/features/tasks/useTasks';
import { useProjects } from '../../src/features/projects/useProjects';
import { TaskItem } from '../../src/features/tasks/TaskItem';
import { SyncBadge } from '../../src/components/SyncBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { runSync } from '../../src/services/sync/syncEngine';
import { useAuthStore } from '../../src/state/authStore';
import { signOut } from '../../src/features/auth/useAuth';
import { Task } from '../../src/types/models';
import { colors } from '../../src/theme/colors';
import { spacing, typography, radius } from '../../src/theme/spacing';

// ─── Account menu + header ────────────────────────────────────────────────────

function Header(): React.ReactElement {
  const session = useAuthStore((s) => s.session);
  const email = session?.user?.email ?? '';
  const initial = (email.charAt(0) || 'A').toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = useCallback(async (): Promise<void> => {
    setMenuOpen(false);
    await signOut();
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>Today</Text>
        <Text style={styles.headerDate}>{today}</Text>
      </View>

      <View style={styles.headerRight}>
        <SyncBadge />
        <TouchableOpacity
          onPress={() => setMenuOpen((v) => !v)}
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel="Account menu"
        >
          <Text style={styles.avatarText}>{initial}</Text>
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <View style={styles.menu}>
          <Text style={styles.menuEmail} numberOfLines={1}>
            {email || 'Signed in'}
          </Text>
          <View style={styles.menuDivider} />
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.menuItem}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.menuItemText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Today screen ─────────────────────────────────────────────────────────────

export default function TodayScreen(): React.ReactElement {
  const ownerId = useAuthStore((s) => s.session?.user.id ?? '');
  const { tasks, loading, toggleTask, deleteTask, refresh } = useTasks(ownerId, null);
  const { projects } = useProjects(ownerId);

  const openTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  function getProjectName(projectId: string | null): string | undefined {
    if (!projectId) return undefined;
    return projects.find((p) => p.id === projectId)?.name;
  }

  function openCapture(): void {
    router.push('/capture');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header />
        <ActivityIndicator
          color={colors.accent}
          style={{ marginTop: spacing.xxl }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Header />

      <FlatList
        data={openTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={false}
        ListHeaderComponent={
          openTasks.length === 0 && doneTasks.length === 0 ? null : (
            <Text style={styles.sectionLabel}>
              {openTasks.length} open
            </Text>
          )
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing due today"
            subtitle="Tap + to capture a task or note"
          />
        }
        ListFooterComponent={
          doneTasks.length > 0 ? (
            <View>
              <Text style={[styles.sectionLabel, styles.sectionLabelDone]}>
                {doneTasks.length} completed
              </Text>
              {doneTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  projectName={getProjectName(task.project_id)}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }: { item: Task }) => (
          <TaskItem
            task={item}
            projectName={getProjectName(item.project_id)}
            onToggle={() => toggleTask(item.id)}
            onDelete={() => deleteTask(item.id)}
          />
        )}
      />

      <TouchableOpacity
        onPress={openCapture}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Capture task or note"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    zIndex: 10,
  },
  headerLeft: {
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  headerDate: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.accent,
  },
  menu: {
    position: 'absolute',
    top: 62,
    right: spacing.md,
    minWidth: 220,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  menuEmail: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  menuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuItemText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.destructive,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + 60,
  },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabelDone: {
    marginTop: spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.textInverse,
    lineHeight: 32,
  },
});

// src/features/tasks/useTasks.ts
// Reactive task list. Scoped to all tasks (Today) or a project (Project Detail).

import { useEffect, useState, useCallback } from 'react';
import {
  listAllTasks,
  listTasksByProject,
  createTask,
  toggleTask,
  softDeleteTask,
} from '../../services/db/tasksRepo';
import { onSyncEvent } from '../../services/sync/syncEngine';
import { useAuthStore } from '../../state/authStore';
import { Task, CreateTaskInput } from '../../types/models';
import { logger } from '../../lib/logger';

interface UseTasksOptions {
  /** null = Inbox; undefined = all tasks (Today screen) */
  projectId?: string | null;
}

interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addTask: (input: CreateTaskInput) => Promise<Task>;
  toggle: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useTasks({ projectId }: UseTasksOptions = {}): UseTasksResult {
  const session = useAuthStore((s) => s.session);
  const ownerId = session?.user?.id;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) return;
    try {
      const result =
        projectId === undefined
          ? await listAllTasks(ownerId)
          : await listTasksByProject(ownerId, projectId);
      setTasks(result);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load tasks';
      logger.error('useTasks.load:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [ownerId, projectId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const unsub = onSyncEvent((event) => {
      if (event.type === 'sync_success') void load();
    });
    return unsub;
  }, [load]);

  const addTask = useCallback(async (input: CreateTaskInput): Promise<Task> => {
    if (!ownerId) throw new Error('Not authenticated');
    const task = await createTask(ownerId, input);
    setTasks((prev) => [task, ...prev]);
    return task;
  }, [ownerId]);

  const toggle = useCallback(async (id: string): Promise<void> => {
    if (!ownerId) return;
    const nextStatus = await toggleTask(ownerId, id);
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t))
    );
  }, [ownerId]);

  const remove = useCallback(async (id: string): Promise<void> => {
    if (!ownerId) return;
    await softDeleteTask(ownerId, id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, [ownerId]);

  return { tasks, loading, error, refresh: load, addTask, toggle, remove };
}

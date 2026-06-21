// src/features/projects/useProjects.ts
// Reactive project list. Reads from SQLite; re-fetches after sync events.

import { useEffect, useState, useCallback } from 'react';
import {
  listProjects,
  createProject,
  archiveProject,
  updateProjectName,
} from '../../services/db/projectsRepo';
import { onSyncEvent } from '../../services/sync/syncEngine';
import { useAuthStore } from '../../state/authStore';
import { Project, CreateProjectInput } from '../../types/models';
import { logger } from '../../lib/logger';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addProject: (input: CreateProjectInput) => Promise<Project>;
  archive: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
}

export function useProjects(): UseProjectsResult {
  const session = useAuthStore((s) => s.session);
  const ownerId = session?.user?.id;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) return;
    try {
      const result = await listProjects(ownerId);
      setProjects(result);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load projects';
      logger.error('useProjects.load:', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  // Load on mount and whenever ownerId changes
  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Re-load after every sync cycle so the list reflects server changes
  useEffect(() => {
    const unsub = onSyncEvent((event) => {
      if (event.type === 'sync_success') {
        void load();
      }
    });
    return unsub;
  }, [load]);

  const addProject = useCallback(async (input: CreateProjectInput): Promise<Project> => {
    if (!ownerId) throw new Error('Not authenticated');
    const project = await createProject(ownerId, input);
    // Optimistic update — add to list immediately
    setProjects((prev) => [project, ...prev]);
    return project;
  }, [ownerId]);

  const archive = useCallback(async (id: string): Promise<void> => {
    if (!ownerId) return;
    await archiveProject(ownerId, id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, [ownerId]);

  const rename = useCallback(async (id: string, name: string): Promise<void> => {
    if (!ownerId) return;
    await updateProjectName(ownerId, id, name);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  }, [ownerId]);

  return {
    projects,
    loading,
    error,
    refresh: load,
    addProject,
    archive,
    rename,
  };
}

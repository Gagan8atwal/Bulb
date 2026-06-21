// src/services/db/tasksRepo.web.ts
// WEB implementation of the tasks repository. Same signatures as tasksRepo.ts,
// backed by Supabase directly (RLS-enforced). See projectsRepo.web.ts for the
// rationale.

import { supabase } from '../../lib/supabase';
import { Task, CreateTaskInput, TaskStatus } from '../../types/models';
import { generateId } from '../../lib/id';
import { nowIso } from '../../lib/time';
import { logger } from '../../lib/logger';

const TABLE = 'tasks';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listAllTasks(ownerId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('[web] listAllTasks failed:', error.message);
    throw error;
  }
  return (data ?? []) as Task[];
}

export async function listTasksByProject(
  ownerId: string,
  projectId: string | null
): Promise<Task[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null);

  query = projectId === null
    ? query.is('project_id', null)
    : query.eq('project_id', projectId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    logger.error('[web] listTasksByProject failed:', error.message);
    throw error;
  }
  return (data ?? []) as Task[];
}

export async function countOpenTasksByProject(
  ownerId: string,
  projectId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('project_id', projectId)
    .eq('status', 'todo')
    .is('deleted_at', null);
  if (error) {
    logger.error('[web] countOpenTasksByProject failed:', error.message);
    throw error;
  }
  return count ?? 0;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createTask(
  ownerId: string,
  input: CreateTaskInput
): Promise<Task> {
  const now = nowIso();
  const task: Task = {
    id: generateId(),
    owner_id: ownerId,
    project_id: input.project_id ?? null,
    title: input.title.trim(),
    status: 'todo',
    source: input.source,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const { error } = await supabase.from(TABLE).insert(task);
  if (error) {
    logger.error('[web] createTask failed:', error.message);
    throw error;
  }
  return task;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export async function toggleTask(ownerId: string, id: string): Promise<TaskStatus> {
  // Read current status, then flip it
  const { data: current, error: readErr } = await supabase
    .from(TABLE)
    .select('status')
    .eq('id', id)
    .eq('owner_id', ownerId)
    .single();
  if (readErr) {
    logger.error('[web] toggleTask read failed:', readErr.message);
    throw readErr;
  }
  const nextStatus: TaskStatus = current.status === 'todo' ? 'done' : 'todo';

  const { error } = await supabase
    .from(TABLE)
    .update({ status: nextStatus, updated_at: nowIso() })
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) {
    logger.error('[web] toggleTask update failed:', error.message);
    throw error;
  }
  return nextStatus;
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function softDeleteTask(ownerId: string, id: string): Promise<void> {
  const now = nowIso();
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) {
    logger.error('[web] softDeleteTask failed:', error.message);
    throw error;
  }
}

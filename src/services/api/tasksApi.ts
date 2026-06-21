// src/services/api/tasksApi.ts
// Supabase CRUD for tasks. Called only by the sync engine.

import { supabase } from '../../lib/supabase';
import { Task } from '../../types/models';
import { logger } from '../../lib/logger';

const TABLE = 'tasks';

export async function upsertTaskRemote(task: Task): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(task, {
    onConflict: 'id',
  });
  if (error) {
    logger.error('API tasksApi.upsert failed:', error.message);
    throw error;
  }
}

export async function softDeleteTaskRemote(
  id: string,
  deletedAt: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id);
  if (error) {
    logger.error('API tasksApi.softDelete failed:', error.message);
    throw error;
  }
}

export async function fetchAllTasksRemote(): Promise<Task[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('API tasksApi.fetchAll failed:', error.message);
    throw error;
  }
  return (data ?? []) as Task[];
}

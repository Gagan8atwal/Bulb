// src/services/api/memoryApi.ts
// Supabase CRUD for memory_items. Called only by the sync engine.

import { supabase } from '../../lib/supabase';
import { MemoryItem } from '../../types/models';
import { logger } from '../../lib/logger';

const TABLE = 'memory_items';

export async function upsertNoteRemote(item: MemoryItem): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(item, {
    onConflict: 'id',
  });
  if (error) {
    logger.error('API memoryApi.upsert failed:', error.message);
    throw error;
  }
}

export async function softDeleteNoteRemote(
  id: string,
  deletedAt: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id);
  if (error) {
    logger.error('API memoryApi.softDelete failed:', error.message);
    throw error;
  }
}

export async function fetchAllNotesRemote(): Promise<MemoryItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('API memoryApi.fetchAll failed:', error.message);
    throw error;
  }
  return (data ?? []) as MemoryItem[];
}

// src/services/db/memoryRepo.web.ts
// WEB implementation of the notes (memory_items) repository. Same signatures as
// memoryRepo.ts, backed by Supabase directly (RLS-enforced).

import { supabase } from '../../lib/supabase';
import { MemoryItem, CreateNoteInput } from '../../types/models';
import { generateId } from '../../lib/id';
import { nowIso } from '../../lib/time';
import { logger } from '../../lib/logger';

const TABLE = 'memory_items';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listNotes(ownerId: string): Promise<MemoryItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', ownerId)
    .eq('kind', 'note')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('[web] listNotes failed:', error.message);
    throw error;
  }
  return (data ?? []) as MemoryItem[];
}

export async function listNotesByProject(
  ownerId: string,
  projectId: string | null
): Promise<MemoryItem[]> {
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', ownerId)
    .eq('kind', 'note')
    .is('deleted_at', null);

  query = projectId === null
    ? query.is('project_id', null)
    : query.eq('project_id', projectId);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    logger.error('[web] listNotesByProject failed:', error.message);
    throw error;
  }
  return (data ?? []) as MemoryItem[];
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createNote(
  ownerId: string,
  input: CreateNoteInput
): Promise<MemoryItem> {
  const now = nowIso();
  const item: MemoryItem = {
    id: generateId(),
    owner_id: ownerId,
    project_id: input.project_id ?? null,
    kind: 'note',
    content: input.content.trim(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const { error } = await supabase.from(TABLE).insert(item);
  if (error) {
    logger.error('[web] createNote failed:', error.message);
    throw error;
  }
  return item;
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function softDeleteNote(ownerId: string, id: string): Promise<void> {
  const now = nowIso();
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) {
    logger.error('[web] softDeleteNote failed:', error.message);
    throw error;
  }
}

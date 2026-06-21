// src/services/api/projectsApi.ts
// Supabase CRUD for projects.
//
// RULE: Only the sync engine (pushOutbox, pullSnapshot) calls these functions.
// Feature hooks read from SQLite via projectsRepo. This enforces the
// "SQLite is the read source of truth on device" architecture.

import { supabase } from '../../lib/supabase';
import { Project } from '../../types/models';
import { logger } from '../../lib/logger';

const TABLE = 'projects';

// ─── Called by pushOutbox ─────────────────────────────────────────────────────

/**
 * Upsert a project to Supabase. Idempotent — safe to retry on network error.
 * Uses ON CONFLICT DO UPDATE via Supabase's upsert().
 */
export async function upsertProjectRemote(project: Project): Promise<void> {
  const { error } = await supabase.from(TABLE).upsert(project, {
    onConflict: 'id',
  });
  if (error) {
    logger.error('API projectsApi.upsert failed:', error.message);
    throw error;
  }
}

/**
 * Soft-delete a project on the server by setting deleted_at.
 */
export async function softDeleteProjectRemote(
  id: string,
  deletedAt: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id);
  if (error) {
    logger.error('API projectsApi.softDelete failed:', error.message);
    throw error;
  }
}

// ─── Called by pullSnapshot ───────────────────────────────────────────────────

/**
 * Fetch all projects for the signed-in user.
 * RLS enforces owner scope — no explicit filter needed.
 * Includes soft-deleted rows so local reconciliation can remove orphaned rows.
 */
export async function fetchAllProjectsRemote(): Promise<Project[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('API projectsApi.fetchAll failed:', error.message);
    throw error;
  }
  return (data ?? []) as Project[];
}

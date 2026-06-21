// src/services/db/projectsRepo.web.ts
// WEB implementation of the projects repository.
//
// Exposes the EXACT same function signatures as the native projectsRepo.ts, so
// the hooks (useProjects, etc.) work unchanged. The difference is the backing
// store: native uses SQLite + outbox + background sync; web reads and writes
// Supabase directly (the browser is online, supabase-js works natively, and RLS
// enforces ownership server-side).
//
// IDs are still generated client-side (same as native) so behavior matches.

import { supabase } from '../../lib/supabase';
import { Project, CreateProjectInput } from '../../types/models';
import { generateId } from '../../lib/id';
import { nowIso } from '../../lib/time';
import { logger } from '../../lib/logger';

const TABLE = 'projects';

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listProjects(ownerId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) {
    logger.error('[web] listProjects failed:', error.message);
    throw error;
  }
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    logger.error('[web] getProject failed:', error.message);
    throw error;
  }
  return (data ?? null) as Project | null;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createProject(
  ownerId: string,
  input: CreateProjectInput
): Promise<Project> {
  const now = nowIso();
  const project: Project = {
    id: generateId(),
    owner_id: ownerId,
    name: input.name.trim(),
    status: 'active',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  const { error } = await supabase.from(TABLE).insert(project);
  if (error) {
    logger.error('[web] createProject failed:', error.message);
    throw error;
  }
  return project;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateProjectName(
  ownerId: string,
  id: string,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ name: name.trim(), updated_at: nowIso() })
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) {
    logger.error('[web] updateProjectName failed:', error.message);
    throw error;
  }
}

export async function archiveProject(ownerId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ status: 'archived', updated_at: nowIso() })
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) {
    logger.error('[web] archiveProject failed:', error.message);
    throw error;
  }
}

// ─── Soft delete ──────────────────────────────────────────────────────────────

export async function softDeleteProject(ownerId: string, id: string): Promise<void> {
  const now = nowIso();
  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: now, updated_at: now })
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) {
    logger.error('[web] softDeleteProject failed:', error.message);
    throw error;
  }
}

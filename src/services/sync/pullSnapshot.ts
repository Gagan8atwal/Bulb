// src/services/sync/pullSnapshot.ts
// Full-snapshot pull: fetch all owner rows from Supabase, replace local.
//
// WHY FULL REFETCH (not incremental):
//   • One user, one device, few hundred rows max in Sprint 1.
//   • Eliminates an entire class of sync bugs (missed events, ordering, gaps).
//   • Change-tracking logic is the single most complex and bug-prone part of
//     any sync system. For this scale, it's permanent over-engineering.
//
// SAFETY: the replace is done per-entity with upserts + reconcile (remove
// local rows absent from the server). If the network drops mid-pull, the
// next pull retries the entire snapshot — no partial state.
//
// ORDERING: Pull always runs AFTER pushOutbox to avoid overwriting local
// changes that haven't reached the server yet.

import { fetchAllProjectsRemote } from '../api/projectsApi';
import { fetchAllTasksRemote } from '../api/tasksApi';
import { fetchAllNotesRemote } from '../api/memoryApi';
import {
  upsertProjectFromServer,
  reconcileProjects,
} from '../db/projectsRepo';
import {
  upsertTaskFromServer,
  reconcileTasks,
} from '../db/tasksRepo';
import {
  upsertNoteFromServer,
  reconcileNotes,
} from '../db/memoryRepo';
import { logger } from '../../lib/logger';

export interface PullResult {
  projects: number;
  tasks: number;
  notes: number;
}

/**
 * Pull all owner data from Supabase and reconcile with local SQLite.
 * @param ownerId - The signed-in user's auth.uid()
 */
export async function pullSnapshot(ownerId: string): Promise<PullResult> {
  logger.debug('pullSnapshot: starting');

  // Fetch all three entity types in parallel (independent requests)
  const [remoteProjects, remoteTasks, remoteNotes] = await Promise.all([
    fetchAllProjectsRemote(),
    fetchAllTasksRemote(),
    fetchAllNotesRemote(),
  ]);

  logger.debug(
    `pullSnapshot: received ${remoteProjects.length} projects, ` +
    `${remoteTasks.length} tasks, ${remoteNotes.length} notes`
  );

  // ── Projects ──────────────────────────────────────────────────────────────
  for (const project of remoteProjects) {
    await upsertProjectFromServer(project);
  }
  await reconcileProjects(ownerId, remoteProjects.map((p) => p.id));

  // ── Tasks ─────────────────────────────────────────────────────────────────
  for (const task of remoteTasks) {
    await upsertTaskFromServer(task);
  }
  await reconcileTasks(ownerId, remoteTasks.map((t) => t.id));

  // ── Notes ─────────────────────────────────────────────────────────────────
  for (const note of remoteNotes) {
    await upsertNoteFromServer(note);
  }
  await reconcileNotes(ownerId, remoteNotes.map((n) => n.id));

  logger.debug('pullSnapshot: complete');

  return {
    projects: remoteProjects.length,
    tasks: remoteTasks.length,
    notes: remoteNotes.length,
  };
}

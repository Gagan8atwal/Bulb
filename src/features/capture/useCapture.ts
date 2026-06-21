// src/features/capture/useCapture.ts
// Commit a capture to SQLite.
//
// This is the only file that decides what a capture becomes:
//   type='task'  → creates a task row + outbox entry
//   type='note'  → creates a memory_item row + outbox entry
//
// Both paths write locally first — the sync engine pushes later.
// The save is guaranteed durable the instant it returns (written to SQLite).
//
// VALIDATION: done here with zod before touching the database.

import { useState, useCallback } from 'react';
import { z } from 'zod';
import { createTask } from '../../services/db/tasksRepo';
import { createNote } from '../../services/db/memoryRepo';
import { useAuthStore } from '../../state/authStore';
import { Task, MemoryItem } from '../../types/models';
import { logger } from '../../lib/logger';

// ── Schema ────────────────────────────────────────────────────────────────────

export type CaptureType = 'task' | 'note';
export type CaptureSource = 'text' | 'voice';

const taskCaptureSchema = z.object({
  title: z.string().trim().min(1).max(280),
  project_id: z.string().uuid().nullable().optional(),
});

const noteCaptureSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  project_id: z.string().uuid().nullable().optional(),
});

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface CaptureInput {
  text: string;
  type: CaptureType;
  source: CaptureSource;
  projectId?: string | null;
}

export interface CaptureResult {
  task?: Task;
  note?: MemoryItem;
}

interface UseCaptureResult {
  saving: boolean;
  error: string | null;
  save: (input: CaptureInput) => Promise<CaptureResult | null>;
  clearError: () => void;
}

export function useCapture(): UseCaptureResult {
  const session = useAuthStore((s) => s.session);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(async (input: CaptureInput): Promise<CaptureResult | null> => {
    const ownerId = session?.user?.id;
    if (!ownerId) {
      setError('Not authenticated');
      return null;
    }

    setSaving(true);
    setError(null);

    try {
      if (input.type === 'task') {
        // Validate
        const parsed = taskCaptureSchema.safeParse({
          title: input.text,
          project_id: input.projectId,
        });
        if (!parsed.success) {
          setError(parsed.error.errors[0]?.message ?? 'Invalid task');
          return null;
        }

        const task = await createTask(ownerId, {
          title: parsed.data.title,
          source: input.source,
          project_id: parsed.data.project_id ?? null,
        });

        logger.debug('useCapture: task created', task.id);
        return { task };
      } else {
        // Note
        const parsed = noteCaptureSchema.safeParse({
          content: input.text,
          project_id: input.projectId,
        });
        if (!parsed.success) {
          setError(parsed.error.errors[0]?.message ?? 'Invalid note');
          return null;
        }

        const note = await createNote(ownerId, {
          content: parsed.data.content,
          project_id: parsed.data.project_id ?? null,
        });

        logger.debug('useCapture: note created', note.id);
        return { note };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      logger.error('useCapture.save failed:', message);
      setError(message);
      return null;
    } finally {
      setSaving(false);
    }
  }, [session]);

  const clearError = useCallback(() => setError(null), []);

  return { saving, error, save, clearError };
}

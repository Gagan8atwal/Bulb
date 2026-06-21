// src/state/syncStore.ts
// Sync UI state — drives the SyncBadge component and pull-to-refresh feedback.
// The real sync logic lives in syncEngine.ts; this store is UI-only.

import { create } from 'zustand';
import type { SyncStatus } from '../types/models';

interface SyncState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;  // ISO string
  failedItemCount: number;      // outbox items stuck in 'failed' state

  // Actions
  setOnline: (online: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncedAt: (at: string) => void;
  setFailedItemCount: (count: number) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,       // Optimistic default; NetInfo corrects on mount
  syncStatus: 'idle',
  lastSyncedAt: null,
  failedItemCount: 0,

  setOnline: (isOnline) => set({ isOnline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setFailedItemCount: (failedItemCount) => set({ failedItemCount }),
}));

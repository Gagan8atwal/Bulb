// app/_layout.tsx
// Root layout. Responsibilities:
//   1. Call useAuthSetup() — wires up the Supabase onAuthStateChange listener.
//   2. Wire up NetInfo → syncStore + trigger sync on reconnect.
//   3. Bridge syncEngine events → syncStore (drives SyncBadge UI).
//   4. Define the root Stack, including the capture modal screen.
//
// This file has NO visible UI of its own — it's all wiring.

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';

import { useAuthSetup } from '../src/features/auth/useAuth';
import { useAuthStore } from '../src/state/authStore';
import { useSyncStore } from '../src/state/syncStore';
import { runSync, onSyncEvent, isSyncing } from '../src/services/sync/syncEngine';
import { nowIso } from '../src/lib/time';
import { logger } from '../src/lib/logger';

export default function RootLayout(): React.ReactElement {
  // ── 1. Auth: resolves persisted session + subscribes to auth changes ───────
  useAuthSetup();

  const session = useAuthStore((s) => s.session);
  const { setOnline, setSyncStatus, setLastSyncedAt, setFailedItemCount } = useSyncStore();

  // ── 2. NetInfo: track connectivity, trigger sync on reconnect ─────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setOnline(online);
      logger.debug('NetInfo: online =', online);

      if (online && session?.user?.id && !isSyncing()) {
        void runSync(session.user.id);
      }
    });
    return () => unsubscribe();
  }, [session, setOnline]);

  // ── 3. Sync events → syncStore (keeps SyncBadge accurate) ─────────────────
  useEffect(() => {
    const unsub = onSyncEvent((event) => {
      switch (event.type) {
        case 'sync_start':
          setSyncStatus('syncing');
          break;
        case 'sync_success':
          setSyncStatus('idle');
          setLastSyncedAt(nowIso());
          setFailedItemCount(event.failedCount ?? 0);
          break;
        case 'sync_error':
          setSyncStatus('error');
          break;
      }
    });
    return unsub;
  }, [setSyncStatus, setLastSyncedAt, setFailedItemCount]);

  // ── 4. Kick off initial sync when session becomes available ───────────────
  useEffect(() => {
    if (session?.user?.id) {
      void runSync(session.user.id);
    }
  }, [session?.user?.id]);

  // ── 5. Root Stack ─────────────────────────────────────────────────────────
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ animation: 'fade' }} />
      <Stack.Screen name="(app)" />
      <Stack.Screen
        name="capture"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          // The capture screen has its own header with Cancel
          headerShown: false,
        }}
      />
    </Stack>
  );
}

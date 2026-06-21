// app/(app)/_layout.tsx
// Authenticated tab layout.
//
// Responsibilities:
//   1. Face ID gate on cold start and every resume from background.
//   2. Tab navigation: Today | Projects.
//   3. 60-second background sync timer.
//   4. Redirect to /login if session is lost (token revoked, sign-out).
//
// Navigation note: project/[id] is defined here as a hidden Tabs.Screen
// with tabBarStyle: { display: 'none' } so the tab bar disappears on
// project detail without adding a separate Stack layout layer.

import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, router } from 'expo-router';
import {
  AppState,
  AppStateStatus,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../src/state/authStore';
import {
  getBiometricCapability,
  authenticateWithBiometric,
} from '../../src/features/auth/biometric';
import { signOut } from '../../src/features/auth/useAuth';
import { runSync, isSyncing } from '../../src/services/sync/syncEngine';
import { colors } from '../../src/theme/colors';
import { spacing, typography } from '../../src/theme/spacing';

// ─── Face ID lock screen ──────────────────────────────────────────────────────

interface LockScreenProps {
  onUnlock: () => void;
  onSignOut: () => void;
}

function LockScreen({ onUnlock, onSignOut }: LockScreenProps): React.ReactElement {
  const [checking, setChecking] = useState(false);
  // LockScreen owns its own fail counter — no parent wiring needed
  const [failCount, setFailCount] = useState(0);

  async function handleUnlock(): Promise<void> {
    setChecking(true);
    const result = await authenticateWithBiometric();
    setChecking(false);
    if (result.success) {
      onUnlock();
    } else if (result.error !== 'cancelled') {
      // Count every non-cancelled failure (failed, lockout, unknown)
      setFailCount((n) => n + 1);
    }
  }

  return (
    <SafeAreaView style={lockStyles.screen}>
      <View style={lockStyles.content}>
        <Text style={lockStyles.icon}>🔒</Text>
        <Text style={lockStyles.title}>AL Command is locked</Text>
        <Text style={lockStyles.subtitle}>Authenticate to continue</Text>

        {failCount > 0 && (
          <Text style={lockStyles.failText}>
            Authentication failed ({failCount}/3)
          </Text>
        )}

        <TouchableOpacity
          onPress={handleUnlock}
          style={lockStyles.btn}
          disabled={checking}
          accessibilityRole="button"
          accessibilityLabel="Unlock with Face ID"
        >
          {checking ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={lockStyles.btnText}>Unlock with Face ID</Text>
          )}
        </TouchableOpacity>

        {failCount >= 3 && (
          <TouchableOpacity
            onPress={onSignOut}
            style={lockStyles.signOutBtn}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={lockStyles.signOutText}>Sign out</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Authenticated layout ─────────────────────────────────────────────────────

export default function AppLayout(): React.ReactElement | null {
  const { session, locked, setLocked, signOut: clearSession } = useAuthStore();
  const [lockCheckDone, setLockCheckDone] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  // ── Redirect to login if no session ───────────────────────────────────────
  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session]);

  // ── Check biometric capability once on mount ───────────────────────────────
  useEffect(() => {
    getBiometricCapability().then((cap) => {
      setBioAvailable(cap.shouldLock);
      if (cap.shouldLock) {
        setLocked(true);
      }
      setLockCheckDone(true);
    });
  }, [setLocked]);

  // ── AppState listener: lock on background, prompt on resume ───────────────
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus): void => {
      if (nextState === 'background' && bioAvailable) {
        setLocked(true);
      }
      if (nextState === 'active' && session?.user?.id && !isSyncing()) {
        void runSync(session.user.id);
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [bioAvailable, session, setLocked]);

  // ── 60-second sync timer while foregrounded ───────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    const interval = setInterval(() => {
      if (!isSyncing()) {
        void runSync(session.user.id!);
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  // ── Biometric unlock handler ───────────────────────────────────────────────
  const handleUnlock = useCallback((): void => {
    setLocked(false);
  }, [setLocked]);

  const handleSignOut = useCallback(async (): Promise<void> => {
    await signOut();
    clearSession();
    router.replace('/login');
  }, [clearSession]);

  // ── Hold render until biometric check completes (prevents flash) ──────────
  if (!lockCheckDone) return null;

  // ── Face ID lock screen ────────────────────────────────────────────────────
  if (locked && bioAvailable) {
    return (
      <LockScreen
        onUnlock={handleUnlock}
        onSignOut={handleSignOut}
      />
    );
  }

  // ── Tab navigator ──────────────────────────────────────────────────────────
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Project detail — hidden from tab bar, tab bar hidden when active */}
      <Tabs.Screen
        name="project/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.tabBarBackground,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
});

const lockStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  failText: {
    fontSize: typography.size.sm,
    color: colors.warning,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minWidth: 220,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 50,
    justifyContent: 'center',
  },
  btnText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textInverse,
  },
  signOutBtn: {
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  signOutText: {
    fontSize: typography.size.sm,
    color: colors.destructive,
  },
});

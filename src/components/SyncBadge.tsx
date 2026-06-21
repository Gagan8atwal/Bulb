// src/components/SyncBadge.tsx
// Small status indicator shown in screen headers.
// Reads from useSyncStore — no logic here, just display.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSyncStore } from '../state/syncStore';
import { colors } from '../theme/colors';
import { spacing, typography, radius } from '../theme/spacing';

export function SyncBadge(): React.ReactElement {
  const { isOnline, syncStatus, failedItemCount } = useSyncStore();

  if (!isOnline) {
    return (
      <View style={[styles.badge, styles.offline]}>
        <Text style={styles.text}>Offline</Text>
      </View>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <View style={[styles.badge, styles.syncing]}>
        <Text style={styles.text}>Syncing…</Text>
      </View>
    );
  }

  if (syncStatus === 'error' || failedItemCount > 0) {
    return (
      <View style={[styles.badge, styles.error]}>
        <Text style={styles.text}>
          {failedItemCount > 0 ? `${failedItemCount} unsynced` : 'Sync error'}
        </Text>
      </View>
    );
  }

  // Idle + online = no badge (clean UI)
  return <View />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  offline: {
    backgroundColor: colors.warningLight,
  },
  syncing: {
    backgroundColor: colors.accentLight,
  },
  error: {
    backgroundColor: colors.destructiveLight,
  },
  text: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
});

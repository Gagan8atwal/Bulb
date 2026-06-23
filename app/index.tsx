import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/state/authStore';
import { colors } from '../src/theme/colors';

export default function Index(): React.ReactElement {
  const { session, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(app)/today" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

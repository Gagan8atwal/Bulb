// src/components/Button.tsx
// Reusable button. No data access — presentational only.

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography, radius } from '../theme/spacing';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: Props): React.ReactElement {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textInverse : colors.textPrimary}
          size="small"
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`]]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    minWidth: 120,
  },

  // Variants
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructive: {
    backgroundColor: colors.destructiveLight,
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  disabled: {
    opacity: 0.45,
  },

  // Labels
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  label_primary: {
    color: colors.textInverse,
  },
  label_secondary: {
    color: colors.textPrimary,
  },
  label_destructive: {
    color: colors.destructive,
  },
  label_ghost: {
    color: colors.textSecondary,
  },
});

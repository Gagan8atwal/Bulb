// src/components/TextField.tsx
// Labeled text input with validation error and optional character counter.

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography, radius } from '../theme/spacing';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  maxLength?: number;
  showCount?: boolean;
}

export function TextField({
  label,
  error,
  maxLength,
  showCount = false,
  value,
  ...inputProps
}: Props): React.ReactElement {
  const count = value?.length ?? 0;
  const atLimit = maxLength !== undefined && count >= maxLength;

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        value={value}
        maxLength={maxLength}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        style={[
          styles.input,
          error ? styles.inputError : undefined,
        ]}
        {...inputProps}
      />
      <View style={styles.footer}>
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View /> // spacer
        )}
        {showCount && maxLength !== undefined && (
          <Text style={[styles.countText, atLimit && styles.countAtLimit]}>
            {count}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.size.base,
    color: colors.textPrimary,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 16,
  },
  errorText: {
    fontSize: typography.size.xs,
    color: colors.destructive,
    flex: 1,
  },
  countText: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  countAtLimit: {
    color: colors.warning,
  },
});

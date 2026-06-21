// src/theme/spacing.ts
// Spacing scale (8pt grid) and typography for AL Command.
// Every margin, padding, and font size must come from here.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Spacing = keyof typeof spacing;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  // Sizes
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    display: 34,
  },
  // Weights (numeric, as React Native expects)
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  // Line heights
  leading: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// Safe area helpers — screens should use these for consistent insets
export const layout = {
  headerHeight: 56,
  tabBarHeight: 83,      // 49 bar + ~34 home indicator
  screenPaddingH: spacing.md,
  screenPaddingTop: spacing.md,
} as const;

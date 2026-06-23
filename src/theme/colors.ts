// src/theme/colors.ts
export const colors = {
  background: '#0B0B0F',
  surface: '#16161C',
  surfaceElevated: '#1E1E26',
  border: '#272730',
  borderSubtle: '#19191F',
  textPrimary: '#F2F2F5',
  textSecondary: '#9A9AA6',
  textTertiary: '#5C5C68',
  textInverse: '#0B0B0F',
  accent: '#8A8CF0',
  accentLight: 'rgba(138, 140, 240, 0.14)',
  accentDim: 'rgba(138, 140, 240, 0.55)',
  success: '#46CC8A',
  successLight: 'rgba(70, 204, 138, 0.14)',
  warning: '#F2B33D',
  warningLight: 'rgba(242, 179, 61, 0.14)',
  destructive: '#F2554D',
  destructiveLight: 'rgba(242, 85, 77, 0.14)',
  tabBarActive: '#8A8CF0',
  tabBarInactive: '#5C5C68',
  tabBarBackground: '#0B0B0F',
  transparent: 'transparent',
  overlay: 'rgba(8, 8, 12, 0.66)',
} as const;

export type Color = keyof typeof colors;

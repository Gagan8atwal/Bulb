// src/theme/colors.ts
// Design tokens for AL Command.
// Dark-first palette — the app is always dark (userInterfaceStyle: 'dark').
// Every color in the app must come from this file. No inline hex strings.

export const colors = {
  // ─── Backgrounds ──────────────────────────────────────────────────────────
  background: '#0A0A0B',        // near-black base
  surface: '#141415',           // cards, modals, bottom sheets
  surfaceElevated: '#1C1C1E',   // elevated surface (pickers, dialogs)

  // ─── Borders ──────────────────────────────────────────────────────────────
  border: '#2C2C2E',            // visible separators
  borderSubtle: '#1C1C1E',      // hairline / near-invisible separators

  // ─── Text ─────────────────────────────────────────────────────────────────
  textPrimary: '#FFFFFF',       // primary labels
  textSecondary: '#8E8E93',     // secondary / supporting text
  textTertiary: '#48484A',      // placeholder, disabled
  textInverse: '#000000',       // text on light backgrounds (e.g. buttons)

  // ─── Accent (warm amber — focus, intelligence) ─────────────────────────────
  accent: '#F59E0B',
  accentLight: 'rgba(245, 158, 11, 0.15)',  // tinted backgrounds
  accentDim: 'rgba(245, 158, 11, 0.6)',     // active states

  // ─── Semantic ─────────────────────────────────────────────────────────────
  success: '#34C759',           // done, synced
  successLight: 'rgba(52, 199, 89, 0.15)',
  warning: '#FF9F0A',           // blocked, attention
  warningLight: 'rgba(255, 159, 10, 0.15)',
  destructive: '#FF453A',       // delete, error
  destructiveLight: 'rgba(255, 69, 58, 0.15)',

  // ─── Interactive ──────────────────────────────────────────────────────────
  tabBarActive: '#F59E0B',      // selected tab icon
  tabBarInactive: '#636366',    // unselected tab icon
  tabBarBackground: '#0A0A0B',

  // ─── Misc ─────────────────────────────────────────────────────────────────
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.6)',  // modal overlay
} as const;

export type Color = keyof typeof colors;

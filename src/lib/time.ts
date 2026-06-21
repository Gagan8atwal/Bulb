// src/lib/time.ts
// All timestamps stored as ISO 8601 strings (matching Postgres timestamptz output).
// Never store Date objects in state or SQLite — always strings.

/**
 * Current UTC timestamp as an ISO 8601 string.
 * Use this whenever you need `created_at`, `updated_at`, or `deleted_at`.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Format an ISO timestamp for display (e.g., "Jun 18").
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format an ISO timestamp as a relative label for today's list.
 */
export function formatRelative(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return formatDate(isoString);
}

/**
 * True if the ISO timestamp falls on today's local calendar date.
 */
export function isToday(isoString: string): boolean {
  const date = new Date(isoString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

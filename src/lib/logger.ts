// src/lib/logger.ts
// Thin wrapper around console.* that is compiled away in production.
// RULE: no other file in the codebase should call console.log/warn/error directly.

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

type LogArgs = unknown[];

function format(level: string, args: LogArgs): LogArgs {
  return [`[AL:${level}]`, ...args];
}

export const logger = {
  log(...args: LogArgs): void {
    if (isDev) console.log(...format('LOG', args));
  },
  warn(...args: LogArgs): void {
    if (isDev) console.warn(...format('WARN', args));
  },
  error(...args: LogArgs): void {
    // Errors always log — useful in production crash reports
    console.error(...format('ERR', args));
  },
  debug(...args: LogArgs): void {
    if (isDev) console.log(...format('DBG', args));
  },
} as const;

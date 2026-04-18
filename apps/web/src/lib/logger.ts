/**
 * App-wide structured logger (pino). Browser-safe.
 *
 * Why: CLAUDE.md requires structured JSON logging for important events
 * (function entry/exit, errors, state changes). This is the canonical
 * instance — do not re-instantiate per feature.
 */
import pino from 'pino';

export const logger = pino({
  browser: { asObject: true },
  level: import.meta.env.DEV ? 'debug' : 'info',
  base: { app: 'compass-web' },
});

export type Logger = typeof logger;

/**
 * Pure-value re-exports for server-side consumers (edge functions, PDF templates).
 * No DOM dependency — safe to import in Deno/Node environments.
 */
export {
  colors,
  extendedColors,
  greyscale,
  severity,
  dimensions,
  typography,
  spacing,
  radius,
  shadow,
} from './index';
export type { SeverityLevel, DimensionKey } from './index';

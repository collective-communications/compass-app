/**
 * Pure-value re-exports for server-side consumers (edge functions, PDF templates).
 * No DOM dependency — safe to import in Deno/Node environments.
 */
export {
  colors,
  extendedColors,
  greyscale,
  textColors,
  severity,
  dimensions,
  typography,
  spacing,
  radius,
  shadow,
  neutralCharcoal,
  chartColors,
} from './index';
export type { SeverityLevel, DimensionKey } from './index';

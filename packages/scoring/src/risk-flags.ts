import type { DimensionScoreMap } from './types.js';
import type { RiskFlag, RiskThresholds, RiskSeverity } from './risk-types.js';

/** Default thresholds for risk flag evaluation. */
export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  coreCritical: 50,
  dimensionHigh: 40,
  coreMedium: 70,
};

const DIMENSION_NAMES: Record<string, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  healthy: 3,
};

/**
 * Evaluate risk flags for all dimensions based on score thresholds.
 * Returns flags sorted by severity (critical first). Empty array if all healthy.
 */
export function evaluateRiskFlags(
  scores: DimensionScoreMap,
  thresholds?: RiskThresholds,
): RiskFlag[] {
  const t = thresholds ?? DEFAULT_RISK_THRESHOLDS;
  const flags: RiskFlag[] = [];

  const coreScore = scores.core.score;

  // Core critical check
  if (coreScore < t.coreCritical) {
    flags.push({
      dimensionCode: 'core',
      dimensionName: DIMENSION_NAMES['core'],
      severity: 'critical',
      score: coreScore,
      message: 'Core foundation is broken — address before other dimensions',
    });
  } else if (coreScore <= t.coreMedium) {
    // Core medium check (between coreCritical and coreMedium inclusive)
    flags.push({
      dimensionCode: 'core',
      dimensionName: DIMENSION_NAMES['core'],
      severity: 'medium',
      score: coreScore,
      message: 'Core foundation is fragile — monitor closely',
    });
  }

  // High risk check for all dimensions (including core)
  for (const [code, dim] of Object.entries(scores)) {
    if (dim.score < t.dimensionHigh) {
      // Avoid duplicating core if already flagged as critical
      if (code === 'core' && coreScore < t.coreCritical) continue;

      flags.push({
        dimensionCode: code,
        dimensionName: DIMENSION_NAMES[code] ?? code,
        severity: 'high',
        score: dim.score,
        message: `${DIMENSION_NAMES[code] ?? code} requires immediate attention`,
      });
    }
  }

  flags.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return flags;
}

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'healthy';

/** A flagged risk for a specific dimension. */
export interface RiskFlag {
  dimensionCode: string;
  dimensionName: string;
  severity: RiskSeverity;
  score: number;
  message: string;
}

/** Configurable thresholds for risk evaluation. */
export interface RiskThresholds {
  /** Core score below this is critical. Default 50. */
  coreCritical: number;
  /** Any dimension score below this is high risk. Default 40. */
  dimensionHigh: number;
  /** Core score at or below this (and above coreCritical) is medium. Default 70. */
  coreMedium: number;
}

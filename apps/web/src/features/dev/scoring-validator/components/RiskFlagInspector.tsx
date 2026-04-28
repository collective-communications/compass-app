/**
 * RiskFlagInspector — Risk Flags analysis panel for the Scoring Validator.
 *
 * Shows active risk flag cards with severity borders, proximity hints, and
 * healthy dimension status. Includes an editable threshold panel below.
 */

import React from 'react';
import type { RiskFlag, RiskThresholds } from '@compass/scoring';
import { DEFAULT_RISK_THRESHOLDS } from '@compass/scoring';
import type { ScoringValidatorOutputs } from '../ScoringValidator.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RiskFlagInspectorProps {
  /** Full pipeline outputs from the root ScoringValidator. */
  outputs: ScoringValidatorOutputs;
  /** Current (live) risk thresholds — may differ from defaults. */
  riskThresholds: RiskThresholds;
  /** Called whenever a threshold input changes. */
  onThresholdChange: (field: keyof RiskThresholds, value: number) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'var(--severity-critical-border, #C62828)',
  high: 'var(--severity-high-border, #E65100)',
  medium: 'var(--severity-medium-border, #F9A825)',
};

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'var(--severity-critical-text, #C62828)',
  high: 'var(--severity-high-text, #E65100)',
  medium: 'var(--severity-medium-text, #F57F17)',
};

const DIMENSION_LABELS: Record<string, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

/** Computes a human-readable proximity hint describing how far the score is from a threshold. */
function proximityHint(flag: RiskFlag, thresholds: RiskThresholds): string {
  const { dimensionCode, severity, score } = flag;

  if (dimensionCode === 'core') {
    if (severity === 'critical') {
      const delta = (thresholds.coreCritical - score).toFixed(1);
      return `${delta} points below critical threshold (${thresholds.coreCritical})`;
    }
    if (severity === 'medium') {
      const deltaAboveCritical = (score - thresholds.coreCritical).toFixed(1);
      const deltaBelowMedium = (thresholds.coreMedium - score).toFixed(1);
      return `${deltaAboveCritical} pts above critical (${thresholds.coreCritical}), ${deltaBelowMedium} pts below medium threshold (${thresholds.coreMedium})`;
    }
  }

  // Non-core dimensions flagged as 'high'
  const delta = (thresholds.dimensionHigh - score).toFixed(1);
  return `${delta} points below high threshold (${thresholds.dimensionHigh})`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single active risk flag card. */
function FlagCard({
  flag,
  thresholds,
}: {
  flag: RiskFlag;
  thresholds: RiskThresholds;
}): React.ReactElement {
  const borderColor = SEVERITY_BORDER[flag.severity] ?? 'var(--grey-300, #BDBDBD)';
  const textColor = SEVERITY_TEXT[flag.severity] ?? 'var(--text-tertiary, #757575)';

  return (
    <div
      style={{
        background: 'var(--surface-card, #FFFFFF)',
        border: '1px solid var(--grey-200, #E5E4E0)',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary, #212121)' }}>
          {flag.dimensionName}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'monospace',
            color: textColor,
            letterSpacing: '0.04em',
          }}
        >
          {flag.severity.toUpperCase()}
        </span>
      </div>
      <span
        style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary, #616161)' }}
      >
        Score: {flag.score.toFixed(2)}%
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary, #616161)' }}>
        {flag.message}
      </span>
      <span
        style={{
          fontSize: 11,
          color: 'var(--text-tertiary, #757575)',
          fontFamily: 'monospace',
        }}
      >
        ↳ {proximityHint(flag, thresholds)}
      </span>
    </div>
  );
}

/** Editable threshold panel. */
function ThresholdPanel({
  riskThresholds,
  onThresholdChange,
}: {
  riskThresholds: RiskThresholds;
  onThresholdChange: (field: keyof RiskThresholds, value: number) => void;
}): React.ReactElement {
  const fields: Array<{ key: keyof RiskThresholds; label: string }> = [
    { key: 'coreCritical', label: 'Core critical below' },
    { key: 'dimensionHigh', label: 'Any dimension high below' },
    { key: 'coreMedium', label: 'Core medium below' },
  ];

  function handleReset(): void {
    onThresholdChange('coreCritical', DEFAULT_RISK_THRESHOLDS.coreCritical);
    onThresholdChange('dimensionHigh', DEFAULT_RISK_THRESHOLDS.dimensionHigh);
    onThresholdChange('coreMedium', DEFAULT_RISK_THRESHOLDS.coreMedium);
  }

  return (
    <div
      style={{
        background: 'var(--surface-card, #FFFFFF)',
        border: '1px solid var(--grey-200, #E5E4E0)',
        borderRadius: 8,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #616161)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          Thresholds
        </span>
        <button
          type="button"
          onClick={handleReset}
          style={{
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 4,
            border: '1px solid var(--grey-300, #BDBDBD)',
            background: 'var(--grey-50, #FAFAFA)',
            color: 'var(--text-secondary, #616161)',
            cursor: 'pointer',
          }}
        >
          Reset defaults
        </button>
      </div>
      {fields.map(({ key, label }) => (
        <label
          key={key}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-secondary, #616161)' }}>{label}</span>
          <input
            type="number"
            min={0}
            max={100}
            value={riskThresholds[key]}
            onChange={(e) => onThresholdChange(key, Number(e.target.value))}
            style={{
              width: 60,
              padding: '3px 6px',
              fontSize: 12,
              fontFamily: 'monospace',
              border: '1px solid var(--grey-300, #BDBDBD)',
              borderRadius: 4,
              textAlign: 'right',
              background: 'var(--surface-input, #FFFFFF)',
              color: 'var(--text-primary, #212121)',
            }}
          />
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the Risk Flags analysis tab:
 * - Active flag cards with severity borders and proximity hints.
 * - Healthy dimension list.
 * - Editable threshold panel.
 */
export function RiskFlagInspector({
  outputs,
  riskThresholds,
  onThresholdChange,
}: RiskFlagInspectorProps): React.ReactElement {
  const { riskFlags, surveyScoreResult } = outputs;

  // Derive which dimensions are flagged so we can show the healthy ones below.
  const flaggedCodes = new Set(riskFlags.map((f) => f.dimensionCode));
  const allDimCodes = Object.keys(surveyScoreResult.overallScores);
  const healthyDimCodes = allDimCodes.filter((code) => !flaggedCodes.has(code));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Active flags ──────────────────────────────────────────────── */}
      {riskFlags.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--severity-healthy-text, #2E7D32)',
          }}
        >
          ✓ No active risk flags — all dimensions healthy.
        </p>
      ) : (
        riskFlags.map((flag) => (
          <FlagCard key={flag.dimensionCode} flag={flag} thresholds={riskThresholds} />
        ))
      )}

      {/* ── Healthy dimensions ────────────────────────────────────────── */}
      {healthyDimCodes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {healthyDimCodes.map((code) => (
            <span
              key={code}
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary, #757575)',
              }}
            >
              ✓ {DIMENSION_LABELS[code] ?? code} — healthy
            </span>
          ))}
        </div>
      )}

      {/* ── Threshold panel ───────────────────────────────────────────── */}
      <ThresholdPanel
        riskThresholds={riskThresholds}
        onThresholdChange={onThresholdChange}
      />
    </div>
  );
}

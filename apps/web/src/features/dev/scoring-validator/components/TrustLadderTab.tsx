/**
 * TrustLadderTab — Trust Ladder analysis panel for the Scoring Validator.
 *
 * Displays the 9-rung trust ladder (rung 9 at top, rung 1 at bottom),
 * current level, and next actionable rungs.
 */

import React from 'react';
import type { TrustRungScore, TrustRungStatus } from '@compass/scoring';
import type { DimensionCode } from '@compass/scoring';
import type { ScoringValidatorOutputs } from '../ScoringValidator.js';
import { FormulaCallout, FormulaSection, FormulaRow, FormulaDivider } from './FormulaCallout.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrustLadderTabProps {
  /** Full pipeline outputs from the root ScoringValidator. */
  outputs: ScoringValidatorOutputs;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIMENSION_COLOR: Record<DimensionCode, string> = {
  core: 'var(--color-core, #0C3D50)',
  clarity: 'var(--color-clarity, #FF7F50)',
  connection: 'var(--color-connection, #9FD7C3)',
  collaboration: 'var(--color-collaboration, #E8B4A8)',
};

const DIMENSION_LABEL: Record<DimensionCode, string> = {
  core: 'core',
  clarity: 'clarity',
  connection: 'connection',
  collaboration: 'collab.',
};

const STATUS_ICON: Record<TrustRungStatus, string> = {
  achieved: '✓',
  in_progress: '⟳',
  not_started: '○',
};

const STATUS_COLOR: Record<TrustRungStatus, string> = {
  achieved: 'var(--severity-healthy-text, #2E7D32)',
  in_progress: 'var(--severity-medium-text, #F57F17)',
  not_started: 'var(--text-tertiary, #757575)',
};

const STATUS_LABEL: Record<TrustRungStatus, string> = {
  achieved: 'achieved',
  in_progress: 'in progress',
  not_started: 'not started',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single rung row in the ladder. */
function RungRow({
  rung,
  isCurrentLevel,
}: {
  rung: TrustRungScore;
  isCurrentLevel: boolean;
}): React.ReactElement {
  const dimColor = DIMENSION_COLOR[rung.dimensionCode];
  const statusColor = STATUS_COLOR[rung.status];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderLeft: isCurrentLevel
          ? `3px solid ${dimColor}`
          : '3px solid transparent',
        background: isCurrentLevel
          ? 'var(--grey-50, #FAFAFA)'
          : 'transparent',
        borderRadius: isCurrentLevel ? 4 : 0,
      }}
    >
      {/* Rung number */}
      <span
        style={{
          width: 18,
          flexShrink: 0,
          fontSize: 11,
          fontFamily: 'monospace',
          color: 'var(--text-tertiary, #757575)',
          textAlign: 'right',
        }}
      >
        {rung.rung}
      </span>

      {/* Rung name */}
      <span
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: isCurrentLevel ? 600 : 400,
          color: 'var(--text-primary, #212121)',
          minWidth: 0,
        }}
      >
        {rung.name}
      </span>

      {/* Dimension badge */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'monospace',
          padding: '2px 6px',
          borderRadius: 4,
          background: dimColor,
          color: '#FFFFFF',
          letterSpacing: '0.03em',
          flexShrink: 0,
          textTransform: 'uppercase',
        }}
      >
        {DIMENSION_LABEL[rung.dimensionCode]}
      </span>

      {/* Status */}
      <span
        style={{
          fontSize: 12,
          color: statusColor,
          fontWeight: rung.status === 'achieved' ? 600 : 400,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          minWidth: 90,
          textAlign: 'right',
        }}
      >
        {STATUS_ICON[rung.status]} {STATUS_LABEL[rung.status]}
      </span>

      {/* Raw score */}
      <span
        style={{
          fontSize: 11,
          fontFamily: 'monospace',
          color: 'var(--text-tertiary, #757575)',
          flexShrink: 0,
          minWidth: 36,
          textAlign: 'right',
        }}
      >
        {rung.score.toFixed(2)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the Trust Ladder analysis tab:
 * - Summary card: current level and next actions.
 * - 9-rung list from top (rung 9) to bottom (rung 1).
 */
export function TrustLadderTab({ outputs }: TrustLadderTabProps): React.ReactElement {
  const { trustLadder } = outputs;
  const { rungs, currentLevel, nextActions } = trustLadder;

  // Display rungs highest-first (rung 9 → rung 1).
  const sortedRungs = [...rungs].sort((a, b) => b.rung - a.rung);

  // Derive current level rung name for the summary.
  const currentRung = rungs.find((r) => r.rung === currentLevel);
  const currentLevelLabel =
    currentLevel === 0
      ? 'Level 0 — No rungs achieved'
      : `Level ${currentLevel} — ${currentRung?.name ?? ''}`;

  const nextActionsLabel =
    nextActions.length === 0
      ? 'All rungs achieved'
      : nextActions.join(', ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Summary card ──────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface-card, #FFFFFF)',
          border: '1px solid var(--grey-200, #E5E4E0)',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary, #757575)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Current Level
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-primary, #212121)',
            }}
          >
            {currentLevelLabel}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-tertiary, #757575)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flexShrink: 0,
            }}
          >
            Next Actions
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary, #616161)' }}>
            {nextActionsLabel}
          </span>
        </div>
      </div>

      {/* ── Rung list ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface-card, #FFFFFF)',
          border: '1px solid var(--grey-200, #E5E4E0)',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          padding: '8px 4px',
        }}
      >
        {/* Column header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 12px 6px',
            borderBottom: '1px solid var(--grey-100, #F5F5F5)',
            marginBottom: 4,
          }}
        >
          <span style={{ width: 18, flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-tertiary, #757575)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Rung
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-tertiary, #757575)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              minWidth: 60,
              textAlign: 'center',
            }}
          >
            Dim.
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-tertiary, #757575)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              minWidth: 90,
              textAlign: 'right',
            }}
          >
            Status
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--text-tertiary, #757575)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              minWidth: 36,
              textAlign: 'right',
            }}
          >
            Score
          </span>
        </div>

        {sortedRungs.map((rung) => (
          <RungRow
            key={rung.rung}
            rung={rung}
            isCurrentLevel={rung.rung === currentLevel}
          />
        ))}
      </div>

      {/* ── Formula callout ───────────────────────────────────────────── */}
      <FormulaCallout>
        <FormulaSection title="Rung status — based on rawScore (unormalized 1–4 mean)">
          <FormulaRow expr="rawScore ≥ 3.0"              note="→ achieved" />
          <FormulaRow expr="2.0 ≤ rawScore < 3.0"        note="→ in progress" />
          <FormulaRow expr="rawScore < 2.0"              note="→ not started" />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary, #757575)', fontFamily: 'monospace' }}>
            rawScore = mean Likert value across all questions in the rung&apos;s dimension
          </span>
        </FormulaSection>

        <FormulaDivider />

        <FormulaSection title="Current level">
          <FormulaRow
            expr="currentLevel = max rung where status = achieved"
            note="highest achieved rung; gaps are allowed (rungs need not be consecutive)"
          />
        </FormulaSection>

        <FormulaDivider />

        <FormulaSection title="Next actions">
          <FormulaRow
            expr="nextActions = first 1–2 non-achieved rungs above currentLevel"
            note="surface the immediate focus areas"
          />
        </FormulaSection>
      </FormulaCallout>
    </div>
  );
}

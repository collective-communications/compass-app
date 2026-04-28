/**
 * ComparePanel — side-by-side Scenario A vs Scenario B comparison for the Scoring Validator.
 *
 * Shows a three-column table: Scenario A values, delta (B − A), Scenario B values.
 * When no Scenario B is loaded, prompts the user to select a preset.
 */

import React from 'react';
import type { ScoringValidatorOutputs } from '../ScoringValidator.js';
import type { QuestionAnswer } from '../data/questions.js';
import { PRESETS } from '../data/presets.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComparePanelProps {
  outputsA: ScoringValidatorOutputs;
  outputsB: ScoringValidatorOutputs | null;
  activeBPresetId: string | null;
  onLoadBPreset: (answers: QuestionAnswer[], scaleSize: 4 | 5, presetId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIMENSION_ORDER = ['core', 'clarity', 'connection', 'collaboration'] as const;
type DimensionKey = (typeof DIMENSION_ORDER)[number];

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

function fmtScore(score: number): string {
  return `${score.toFixed(2)}%`;
}

function fmtDelta(delta: number): string {
  if (Math.abs(delta) < 0.005) return '—';
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${Math.abs(delta).toFixed(2)}%`;
}

function deltaStyle(delta: number): React.CSSProperties {
  if (Math.abs(delta) < 0.005) {
    return { color: 'var(--text-tertiary, #9E9E9E)', fontFamily: 'monospace', fontSize: 12 };
  }
  return {
    color:
      delta > 0
        ? 'var(--severity-healthy-text, #2E7D32)'
        : 'var(--severity-critical-text, #C62828)',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 600,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single table cell for A or B columns. */
function Cell({ children, muted = false }: { children: React.ReactNode; muted?: boolean }): React.ReactElement {
  return (
    <td
      style={{
        padding: '8px 12px',
        fontSize: 12,
        fontFamily: 'monospace',
        color: muted
          ? 'var(--text-secondary, #616161)'
          : 'var(--text-primary, #212121)',
        verticalAlign: 'middle',
      }}
    >
      {children}
    </td>
  );
}

/** Delta cell — centered. */
function DeltaCell({ delta }: { delta: number | null }): React.ReactElement {
  if (delta === null) {
    return (
      <td
        style={{
          padding: '8px 12px',
          textAlign: 'center',
          color: 'var(--text-tertiary, #9E9E9E)',
          fontSize: 12,
        }}
      >
        —
      </td>
    );
  }
  return (
    <td style={{ padding: '8px 12px', textAlign: 'center', ...deltaStyle(delta) }}>
      {fmtDelta(delta)}
    </td>
  );
}

/** Section header row spanning all 3 columns. */
function SectionHeader({ label }: { label: string }): React.ReactElement {
  return (
    <tr>
      <td
        colSpan={3}
        style={{
          padding: '6px 12px 4px',
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-tertiary, #9E9E9E)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          borderTop: '1px solid var(--grey-100, #F5F5F5)',
          background: 'var(--grey-50, #FAFAFA)',
        }}
      >
        {label}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Three-column comparison table: Scenario A | Delta (B−A) | Scenario B.
 * Scenario B is loaded via a preset selector at the top.
 */
export function ComparePanel({
  outputsA,
  outputsB,
  activeBPresetId,
  onLoadBPreset,
}: ComparePanelProps): React.ReactElement {
  function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const id = e.target.value;
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) {
      onLoadBPreset(preset.build(), preset.scaleSize, preset.id);
    }
  }

  const archetypeA = outputsA.archetypeMatch.archetype.name;
  const confidenceA = outputsA.archetypeMatch.confidence;
  const distanceA = outputsA.archetypeMatch.distance;
  const healthA = outputsA.surveyScoreResult.coreHealth;

  const archetypeB = outputsB?.archetypeMatch.archetype.name ?? null;
  const confidenceB = outputsB?.archetypeMatch.confidence ?? null;
  const distanceB = outputsB?.archetypeMatch.distance ?? null;
  const healthB = outputsB?.surveyScoreResult.coreHealth ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Scenario B preset selector ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary, #616161)',
            whiteSpace: 'nowrap',
          }}
        >
          Scenario B:
        </span>
        <select
          value={activeBPresetId ?? ''}
          onChange={handlePresetChange}
          style={{
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 4,
            border: '1px solid var(--grey-300, #E0E0E0)',
            background: 'var(--surface-card, #fff)',
            color: 'var(--text-primary, #212121)',
            cursor: 'pointer',
          }}
        >
          <option value="">— pick preset —</option>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {outputsB === null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            color: 'var(--text-tertiary, #9E9E9E)',
            fontSize: 13,
            background: 'var(--surface-card, #FFFFFF)',
            border: '1px solid var(--grey-200, #E5E4E0)',
            borderRadius: 8,
          }}
        >
          Select a preset above to compare against Scenario A.
        </div>
      )}

      {/* ── Comparison table ─────────────────────────────────────────────── */}
      {outputsB !== null && (
        <div
          style={{
            background: 'var(--surface-card, #FFFFFF)',
            border: '1px solid var(--grey-200, #E5E4E0)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            {/* Column headers */}
            <thead>
              <tr style={{ background: 'var(--grey-50, #FAFAFA)', borderBottom: '2px solid var(--grey-200, #E5E4E0)' }}>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-secondary, #616161)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '40%',
                  }}
                >
                  Scenario A
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-secondary, #616161)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '20%',
                  }}
                >
                  Δ
                </th>
                <th
                  style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-secondary, #616161)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: '40%',
                  }}
                >
                  Scenario B
                </th>
              </tr>
            </thead>

            <tbody>
              {/* ── Archetype ─────────────────────────────────────────── */}
              <SectionHeader label="Archetype" />
              <tr style={{ borderBottom: '1px solid var(--grey-100, #F5F5F5)' }}>
                <Cell>
                  <span style={{ fontWeight: 600 }}>{archetypeA}</span>
                  <br />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary, #9E9E9E)' }}>
                    {confidenceA.toUpperCase()} · {distanceA.toFixed(1)}
                  </span>
                </Cell>
                <DeltaCell delta={null} />
                <Cell>
                  <span style={{ fontWeight: 600 }}>{archetypeB}</span>
                  <br />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary, #9E9E9E)' }}>
                    {confidenceB !== null ? confidenceB.toUpperCase() : '—'} · {distanceB !== null ? distanceB.toFixed(1) : '—'}
                  </span>
                </Cell>
              </tr>

              {/* ── Core Health ───────────────────────────────────────── */}
              <SectionHeader label="Core Health" />
              <tr style={{ borderBottom: '1px solid var(--grey-100, #F5F5F5)' }}>
                <Cell muted={false}>{healthA}</Cell>
                <DeltaCell delta={null} />
                <Cell muted={false}>{healthB ?? '—'}</Cell>
              </tr>

              {/* ── Dimension Scores ──────────────────────────────────── */}
              <SectionHeader label="Dimension Scores" />
              {DIMENSION_ORDER.map((dim) => {
                const scoreA = outputsA.surveyScoreResult.overallScores[dim]?.score ?? 0;
                const scoreB = outputsB.surveyScoreResult.overallScores[dim]?.score ?? 0;
                const delta = scoreB - scoreA;

                return (
                  <tr
                    key={dim}
                    style={{ borderBottom: '1px solid var(--grey-100, #F5F5F5)' }}
                  >
                    <Cell>
                      <span style={{ color: 'var(--text-secondary, #616161)', fontSize: 11, marginRight: 6 }}>
                        {DIMENSION_LABELS[dim]}
                      </span>
                      {fmtScore(scoreA)}
                    </Cell>
                    <DeltaCell delta={delta} />
                    <Cell>
                      <span style={{ color: 'var(--text-secondary, #616161)', fontSize: 11, marginRight: 6 }}>
                        {DIMENSION_LABELS[dim]}
                      </span>
                      {fmtScore(scoreB)}
                    </Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * ArchetypeDistanceTab — Archetypes analysis panel for the Scoring Validator.
 *
 * Shows the matched archetype card and a full distance table covering all 6
 * archetype vectors, sorted by distance (closest first).
 */

import React from 'react';
import type { ScoringValidatorOutputs } from '../ScoringValidator.js';
import { FormulaCallout, FormulaSection, FormulaRow, FormulaDivider, FormulaExplanation } from './FormulaCallout.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArchetypeDistanceTabProps {
  /** Full pipeline outputs from the root ScoringValidator. */
  outputs: ScoringValidatorOutputs;
}

type Confidence = 'strong' | 'moderate' | 'weak';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns inline style tokens for a confidence level. */
function confidenceStyle(confidence: Confidence): React.CSSProperties {
  switch (confidence) {
    case 'strong':
      return {
        background: 'var(--severity-healthy-bg, #E8F5E9)',
        color: 'var(--severity-healthy-text, #2E7D32)',
      };
    case 'moderate':
      return {
        background: 'var(--severity-medium-bg, #FFF8E1)',
        color: 'var(--severity-medium-text, #F57F17)',
      };
    case 'weak':
      return {
        background: 'var(--grey-100, #F5F5F5)',
        color: 'var(--text-tertiary, #757575)',
      };
  }
}

/** Badge component for confidence level. */
function ConfidenceBadge({ confidence }: { confidence: Confidence }): React.ReactElement {
  return (
    <span
      style={{
        ...confidenceStyle(confidence),
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'monospace',
        padding: '2px 7px',
        borderRadius: 4,
        letterSpacing: '0.04em',
      }}
    >
      {confidence.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the Archetypes analysis tab:
 * - Matched archetype card with confidence and distance.
 * - Threshold reference annotations.
 * - Full 6-row distance table, winner highlighted.
 */
export function ArchetypeDistanceTab({ outputs }: ArchetypeDistanceTabProps): React.ReactElement {
  const { archetypeMatch, allArchetypeDistances } = outputs;
  const winnerId = archetypeMatch.archetype.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Matched archetype card ─────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface-card, #FFFFFF)',
          border: '1px solid var(--grey-200, #E5E4E0)',
          borderRadius: 8,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-primary, #212121)',
            }}
          >
            {archetypeMatch.archetype.name}
          </span>
          <ConfidenceBadge confidence={archetypeMatch.confidence} />
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'var(--text-secondary, #616161)',
            lineHeight: 1.5,
          }}
        >
          {archetypeMatch.archetype.description}
        </p>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-tertiary, #757575)',
            fontFamily: 'monospace',
          }}
        >
          Distance: {archetypeMatch.distance.toFixed(1)}
        </span>
      </div>

      {/* ── Formula callout ────────────────────────────���─────────────── */}
      <FormulaCallout>
        <FormulaSection title="Euclidean distance">
          <FormulaRow
            expr={<>d = &radic;((s<sub>core</sub>&minus;t<sub>core</sub>)&sup2; + (s<sub>clarity</sub>&minus;t<sub>clarity</sub>)&sup2; + (s<sub>conn.</sub>&minus;t<sub>conn.</sub>)&sup2; + (s<sub>collab.</sub>&minus;t<sub>collab.</sub>)&sup2;)</>}
          />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary, #757575)', fontFamily: 'monospace' }}>
            s = survey scores (%), t = archetype target scores (%)
          </span>
          <FormulaExplanation>
            Each archetype defines target scores for all four dimensions. The distance formula measures how far the current score profile sits from each archetype in four-dimensional space — it captures the overall shape of the profile, not just which individual dimension is highest.
          </FormulaExplanation>
        </FormulaSection>

        <FormulaDivider />

        <FormulaSection title="Best match">
          <FormulaRow
            expr="archetype = argmin d(s, archetype.targets)"
            note="archetype with the smallest distance wins"
          />
          <FormulaExplanation>
            The archetype closest in Euclidean distance is selected as the match. Because all four dimensions contribute equally to the distance, the result reflects the full pattern of scores rather than any single outlier dimension.
          </FormulaExplanation>
        </FormulaSection>

        <FormulaDivider />

        <FormulaSection title="Confidence">
          <FormulaRow expr="d < 15"  note="→ STRONG" />
          <FormulaRow expr="d < 25"  note="→ MODERATE" />
          <FormulaRow expr="d ≥ 25"  note="→ WEAK" />
          <FormulaExplanation>
            Confidence reflects how clearly the scores align with one archetype versus the others. A weak match means the profile sits roughly equidistant from multiple archetypes — the organization may be in transition or exhibit mixed characteristics.
          </FormulaExplanation>
        </FormulaSection>
      </FormulaCallout>

      {/* ── Distance table ───────────────────────────────────────────── */}
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
            fontSize: 12,
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--grey-50, #FAFAFA)',
                borderBottom: '1px solid var(--grey-200, #E5E4E0)',
              }}
            >
              {['Archetype', 'Core', 'Clarity', 'Connection', 'Collab.', 'Distance', 'Confidence'].map(
                (col) => (
                  <th
                    key={col}
                    style={{
                      padding: '8px 12px',
                      textAlign: col === 'Archetype' ? 'left' : 'center',
                      fontWeight: 600,
                      color: 'var(--text-secondary, #616161)',
                      fontSize: 11,
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {allArchetypeDistances.map((row, i) => {
              const isWinner = row.archetype.id === winnerId;
              return (
                <tr
                  key={row.archetype.id}
                  style={{
                    background: isWinner
                      ? 'var(--grey-50, #F5F5F5)'
                      : i % 2 === 0
                        ? 'transparent'
                        : 'var(--grey-25, #FAFAFA)',
                    borderBottom: '1px solid var(--grey-100, #F5F5F5)',
                  }}
                >
                  {/* Archetype name */}
                  <td
                    style={{
                      padding: '9px 12px',
                      fontWeight: isWinner ? 600 : 400,
                      color: 'var(--text-primary, #212121)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isWinner && (
                      <span
                        style={{
                          marginRight: 6,
                          color: 'var(--severity-healthy-text, #2E7D32)',
                        }}
                      >
                        ✓
                      </span>
                    )}
                    {row.archetype.name}
                  </td>
                  {/* Target scores */}
                  {(['core', 'clarity', 'connection', 'collaboration'] as const).map((dim) => (
                    <td
                      key={dim}
                      style={{
                        padding: '9px 12px',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        color: 'var(--text-secondary, #616161)',
                      }}
                    >
                      {row.archetype.targetScores[dim] ?? '—'}
                    </td>
                  ))}
                  {/* Distance */}
                  <td
                    style={{
                      padding: '9px 12px',
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontWeight: isWinner ? 600 : 400,
                      color: 'var(--text-primary, #212121)',
                    }}
                  >
                    {row.distance.toFixed(1)}
                  </td>
                  {/* Confidence badge */}
                  <td
                    style={{ padding: '9px 12px', textAlign: 'center' }}
                  >
                    <ConfidenceBadge confidence={row.confidence} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

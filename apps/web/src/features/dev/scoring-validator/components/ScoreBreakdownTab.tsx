/**
 * ScoreBreakdownTab — full numeric breakdown of dimension and sub-dimension scores.
 *
 * Four dimension rows (bold, expandable). Each expands to show its sub-dimension
 * rows (indented). Formula footnote below table.
 */

import React, { useState } from 'react';
import type { DimensionCode } from '@compass/scoring';
import type { ScoringValidatorOutputs } from '../ScoringValidator.js';
import { FormulaCallout, FormulaSection, FormulaRow, FormulaDivider, FormulaExplanation } from './FormulaCallout.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIMENSION_ORDER: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreBreakdownTabProps {
  outputs: ScoringValidatorOutputs;
  scaleSize: 4 | 5;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Expandable table of dimension and sub-dimension scores with formula footnote. */
export function ScoreBreakdownTab({ outputs, scaleSize }: ScoreBreakdownTabProps): React.ReactElement {
  const [expanded, setExpanded] = useState<Set<DimensionCode>>(new Set());

  function toggleDimension(dim: DimensionCode): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) {
        next.delete(dim);
      } else {
        next.add(dim);
      }
      return next;
    });
  }

  const { overallScores, subDimensionScores } = outputs.surveyScoreResult;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '2px solid var(--grey-200, #E5E4E0)',
              textAlign: 'left',
            }}
          >
            <th
              style={{
                padding: '6px 8px',
                fontWeight: 600,
                color: 'var(--text-secondary, #424242)',
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Dimension / Sub-dimension
            </th>
            <th
              style={{
                padding: '6px 8px',
                fontWeight: 600,
                color: 'var(--text-secondary, #424242)',
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                textAlign: 'right',
                whiteSpace: 'nowrap',
              }}
            >
              Raw Score (1–{scaleSize})
            </th>
            <th
              style={{
                padding: '6px 8px',
                fontWeight: 600,
                color: 'var(--text-secondary, #424242)',
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                textAlign: 'right',
              }}
            >
              Score (%)
            </th>
            <th
              style={{
                padding: '6px 8px',
                fontWeight: 600,
                color: 'var(--text-secondary, #424242)',
                fontSize: 11,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                textAlign: 'right',
                whiteSpace: 'nowrap',
              }}
            >
              Responses
            </th>
          </tr>
        </thead>
        <tbody>
          {DIMENSION_ORDER.map((dim) => {
            const dimScore = overallScores[dim];
            const isExpanded = expanded.has(dim);
            const subScores = subDimensionScores.filter((s) => s.dimensionCode === dim);
            const hasSubDimensions = subScores.length > 0;

            return (
              <React.Fragment key={dim}>
                {/* Dimension row */}
                <tr
                  onClick={() => { if (hasSubDimensions) toggleDimension(dim); }}
                  style={{
                    borderBottom: '1px solid var(--grey-100, #F5F5F5)',
                    cursor: hasSubDimensions ? 'pointer' : 'default',
                    background: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (hasSubDimensions) {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        'var(--grey-50, #FAFAFA)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '8px 8px', fontWeight: 700, color: 'var(--text-primary, #212121)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {hasSubDimensions && (
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text-tertiary, #9E9E9E)',
                            userSelect: 'none',
                            display: 'inline-block',
                            width: 10,
                          }}
                          aria-hidden="true"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                      {!hasSubDimensions && <span style={{ display: 'inline-block', width: 16 }} />}
                      {DIMENSION_LABELS[dim]}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '8px 8px',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: 'var(--text-primary, #212121)',
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    {dimScore.rawScore.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: '8px 8px',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: 'var(--text-primary, #212121)',
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    {dimScore.score.toFixed(2)}%
                  </td>
                  <td
                    style={{
                      padding: '8px 8px',
                      fontFamily: 'monospace',
                      fontSize: 13,
                      color: 'var(--text-primary, #212121)',
                      fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    {dimScore.responseCount}
                  </td>
                </tr>

                {/* Sub-dimension rows */}
                {isExpanded &&
                  subScores.map((sub) => (
                    <tr
                      key={sub.subDimensionCode}
                      style={{
                        borderBottom: '1px solid var(--grey-100, #F5F5F5)',
                        background: 'var(--grey-50, #FAFAFA)',
                      }}
                    >
                      <td
                        style={{
                          padding: '6px 8px 6px 32px',
                          color: 'var(--text-secondary, #424242)',
                          fontFamily: 'monospace',
                          fontSize: 12,
                        }}
                      >
                        {sub.subDimensionCode}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px',
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: 'var(--text-secondary, #424242)',
                          textAlign: 'right',
                        }}
                      >
                        {sub.rawScore.toFixed(2)}
                      </td>
                      <td
                        style={{
                          padding: '6px 8px',
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: 'var(--text-secondary, #424242)',
                          textAlign: 'right',
                        }}
                      >
                        {sub.score.toFixed(2)}%
                      </td>
                      <td
                        style={{
                          padding: '6px 8px',
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: 'var(--text-secondary, #424242)',
                          textAlign: 'right',
                        }}
                      >
                        {sub.responseCount}
                      </td>
                    </tr>
                  ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Formula callout */}
      <FormulaCallout>
        <FormulaSection title="Normalization — per question">
          <FormulaRow
            expr={<>score = (v &minus; 1) / (scale &minus; 1) &times; 100</>}
            note="forward-scored questions"
          />
          <FormulaRow
            expr={<>score = (scale &minus; v) / (scale &minus; 1) &times; 100</>}
            note="reverse-scored questions"
          />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary, #757575)', fontFamily: 'monospace' }}>
            v = answer value (1&ndash;{scaleSize}), scale = {scaleSize}
          </span>
          <FormulaExplanation>
            Each response is mapped to a 0–100% scale so all questions are comparable regardless of direction.
            Reverse-scored questions are flipped so that low agreement on a negatively-worded statement (e.g. "I often feel burned out") still produces a low score.
          </FormulaExplanation>
        </FormulaSection>

        <FormulaDivider />

        <FormulaSection title="Dimension score">
          <FormulaRow
            expr="dimension = mean(question scores)"
            note="equal-weight average across all questions in the dimension, expressed as %"
          />
          <FormulaExplanation>
            All questions within a dimension contribute equally — no single question carries more weight than another.
            The dimension score reflects the average normalized response across every question assigned to that dimension.
          </FormulaExplanation>
        </FormulaSection>

        <FormulaDivider />

        <FormulaSection title="Raw score">
          <FormulaRow
            expr="rawScore = mean(question values)"
            note={`unormalized average of raw Likert values (1–${scaleSize}); used by the Trust Ladder`}
          />
          <FormulaExplanation>
            The raw score preserves the original Likert scale values before normalization.
            The Trust Ladder uses this directly because its rung thresholds were calibrated against the 1–4 scale, not percentages.
          </FormulaExplanation>
        </FormulaSection>
      </FormulaCallout>
    </div>
  );
}

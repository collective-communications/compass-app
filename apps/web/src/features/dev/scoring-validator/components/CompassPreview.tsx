/**
 * CompassPreview — live compass SVG + dimension score cards for the Scoring Validator.
 *
 * Renders a side-by-side layout: the Compass SVG on the left and four dimension
 * score cards on the right. Core card includes a coreHealth badge.
 */

import React from 'react';
import { Compass } from '@compass/compass';
import type { DimensionScore as CompassDimensionScore } from '@compass/compass';
import type { DimensionCode } from '@compass/scoring';
import type { ScoringValidatorOutputs } from '../ScoringValidator.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Hex strings required — SVG fill/stroke cannot resolve CSS custom properties.
const DIMENSION_COLORS: Record<DimensionCode, string> = {
  core: '#0C3D50',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
};

const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'CORE',
  clarity: 'CLARITY',
  connection: 'CONNECTION',
  collaboration: 'COLLABORATION',
};

const DIMENSION_ORDER: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompassPreviewProps {
  outputs: ScoringValidatorOutputs;
}

// ---------------------------------------------------------------------------
// Health badge helpers
// ---------------------------------------------------------------------------

type HealthStyle = { color: string; background: string; border: string };

function healthBadgeStyle(health: 'healthy' | 'fragile' | 'broken'): HealthStyle {
  switch (health) {
    case 'healthy':
      return {
        color: 'var(--severity-healthy-text, #2E7D32)',
        background: 'var(--severity-healthy-bg, #E8F5E9)',
        border: '1px solid var(--severity-healthy-border, #2E7D32)',
      };
    case 'fragile':
      return {
        color: 'var(--severity-medium-text, #7A5F00)',
        background: 'var(--severity-medium-bg, #FFFDE7)',
        border: '1px solid var(--severity-medium-border, #F9A825)',
      };
    case 'broken':
      return {
        color: 'var(--severity-critical-text, #B71C1C)',
        background: 'var(--severity-critical-bg, #FFEBEE)',
        border: '1px solid var(--severity-critical-border, #B71C1C)',
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Compass SVG preview and four dimension score cards. Always rendered — parent guarantees non-null outputs. */
export function CompassPreview({ outputs }: CompassPreviewProps): React.ReactElement {
  const { surveyScoreResult } = outputs;

  const compassScores: CompassDimensionScore[] = DIMENSION_ORDER.map((dim) => ({
    dimension: dim,
    score: surveyScoreResult.overallScores[dim].score,
    color: DIMENSION_COLORS[dim],
    label: DIMENSION_LABELS[dim],
  }));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 32,
      }}
    >
      {/* Compass SVG */}
      <div style={{ flexShrink: 0 }}>
        <Compass
          scores={compassScores}
          size={280}
          animated={false}
          showLabels={true}
          showGapIndicator={true}
        />
      </div>

      {/* Dimension score cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          justifyContent: 'center',
          alignSelf: 'center',
          minWidth: 240,
        }}
      >
        {DIMENSION_ORDER.map((dim) => {
          const dimScore = surveyScoreResult.overallScores[dim];
          const isCore = dim === 'core';

          return (
            <div
              key={dim}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                background: 'var(--surface-card, #FFFFFF)',
                border: '1px solid var(--grey-200, #E5E4E0)',
                borderRadius: 6,
              }}
            >
              {/* Dimension color swatch */}
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: DIMENSION_COLORS[dim],
                  flexShrink: 0,
                }}
                aria-hidden="true"
              />

              {/* Dimension label */}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-primary, #212121)',
                  letterSpacing: '0.04em',
                  flex: 1,
                }}
              >
                {DIMENSION_LABELS[dim]}
              </span>

              {/* Score */}
              <span
                style={{
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary, #424242)',
                }}
              >
                {dimScore.score.toFixed(2)}%
              </span>

              {/* Core health badge */}
              {isCore && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                    borderRadius: 4,
                    ...healthBadgeStyle(surveyScoreResult.coreHealth),
                  }}
                >
                  {surveyScoreResult.coreHealth}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

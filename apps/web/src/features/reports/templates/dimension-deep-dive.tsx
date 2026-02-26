/**
 * DimensionDeepDive — per-dimension score breakdown for the PDF report.
 * Renders horizontal score bars for each dimension with risk indicators.
 *
 * One page per dimension, showing individual question/sub-metric scores
 * as horizontal bar charts with numeric labels.
 */

import type { ReactElement } from 'react';
import type { ReportPayload } from '@compass/types';
import { ReportPageHeader } from './report-layout';

interface DimensionDeepDiveProps {
  payload: ReportPayload;
}

const DIMENSION_META: Record<string, { label: string; color: string }> = {
  core: { label: 'Core', color: '#0A3B4F' },
  clarity: { label: 'Clarity', color: '#FF7F50' },
  connection: { label: 'Connection', color: '#9FD7C3' },
  collaboration: { label: 'Collaboration', color: '#E8B4A8' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#B71C1C',
  high: '#E65100',
  medium: '#F9A825',
  healthy: '#2E7D32',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  healthy: 'Healthy',
};

/** Horizontal score bar rendered as inline SVG for print fidelity. */
function ScoreBar({
  score,
  color,
  width = 280,
}: {
  score: number;
  color: string;
  width?: number;
}): ReactElement {
  const height = 16;
  const clamped = Math.max(0, Math.min(100, score));
  const fillWidth = (clamped / 100) * width;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Score: ${Math.round(clamped)}%`}>
      <rect x={0} y={2} width={width} height={12} rx={6} fill="#E5E4E0" />
      <rect x={0} y={2} width={fillWidth} height={12} rx={6} fill={color} />
    </svg>
  );
}

/** Classifies a score into a severity level for risk indication. */
function scoreSeverity(score: number): string {
  if (score < 40) return 'critical';
  if (score < 55) return 'high';
  if (score < 70) return 'medium';
  return 'healthy';
}

export function DimensionDeepDive({ payload }: DimensionDeepDiveProps): ReactElement {
  const { scores, recommendations, branding } = payload;

  const dimensions = Object.entries(scores.dimensions);

  return (
    <>
      {dimensions.map(([dimKey, dimScore]) => {
        const meta = DIMENSION_META[dimKey];
        if (!meta) return null;

        const severity = scoreSeverity(dimScore);
        const dimRecommendations = recommendations.filter((r) => r.dimension === dimKey);

        return (
          <div key={dimKey} className="report-page">
            <ReportPageHeader branding={branding} />

            {/* Dimension header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: meta.color,
                  flexShrink: 0,
                }}
              />
              <h2 className="report-section-title" style={{ marginBottom: 0 }}>
                {meta.label}
              </h2>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '20pt',
                  fontWeight: 700,
                  color: meta.color,
                }}
              >
                {Math.round(dimScore)}%
              </span>
            </div>

            {/* Risk indicator */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '12px',
                background: '#F5F5F5',
                fontSize: '8pt',
                fontWeight: 500,
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: SEVERITY_COLORS[severity],
                }}
              />
              {SEVERITY_LABELS[severity]} Risk
            </div>

            {/* Overall dimension score bar */}
            <div className="report-card" style={{ borderLeft: `4px solid ${meta.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '10pt', color: '#212121' }}>
                  Overall {meta.label} Score
                </span>
                <span style={{ fontWeight: 600, fontSize: '10pt', color: '#424242' }}>
                  {Math.round(dimScore)}%
                </span>
              </div>
              <ScoreBar score={dimScore} color={meta.color} />
            </div>

            {/* Segment breakdown within this dimension */}
            {Object.keys(scores.segments).length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <p className="report-subtitle">Segment Breakdown</p>
                {Object.entries(scores.segments).map(([segmentKey, segmentScores]) => {
                  const segScore = segmentScores[dimKey];
                  if (segScore === undefined || segScore === null) return null;

                  return (
                    <div
                      key={segmentKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 0',
                        borderBottom: '1px solid #F5F5F5',
                      }}
                    >
                      <span style={{ fontSize: '9pt', color: '#616161', width: '100px', flexShrink: 0 }}>
                        {segmentKey}
                      </span>
                      <ScoreBar score={segScore} color={meta.color} width={200} />
                      <span style={{ fontSize: '9pt', fontWeight: 600, color: '#424242', width: '36px', textAlign: 'right' }}>
                        {Math.round(segScore)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dimension-specific recommendations */}
            {dimRecommendations.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <p className="report-subtitle">Recommendations</p>
                {dimRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="report-card"
                    style={{
                      borderLeft: `4px solid ${SEVERITY_COLORS[rec.severity] ?? SEVERITY_COLORS.medium}`,
                    }}
                  >
                    <p style={{ fontWeight: 600, fontSize: '10pt', color: '#212121', marginBottom: '4px' }}>
                      {rec.title}
                    </p>
                    <p style={{ fontSize: '9pt', color: '#616161', marginBottom: '8px' }}>
                      {rec.description}
                    </p>
                    {rec.actions.length > 0 && (
                      <ul style={{ paddingLeft: '14px', fontSize: '9pt', color: '#424242' }}>
                        {rec.actions.map((action, i) => (
                          <li key={i} style={{ marginBottom: '2px' }}>{action}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

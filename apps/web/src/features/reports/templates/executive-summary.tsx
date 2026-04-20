/**
 * ExecutiveSummary — high-level overview section of the PDF report.
 * Shows overall score, dimension scores, archetype, and key findings.
 */

import type { ReactElement } from 'react';
import type { ReportPayload } from '@compass/types';
import { dimensions, greyscale, colors, severity } from '@compass/tokens';
import { ReportPageHeader } from './report-layout';

interface ExecutiveSummaryProps {
  payload: ReportPayload;
}

const DIMENSION_LABELS: Record<string, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

const DIMENSION_COLORS: Record<string, string> = {
  core: dimensions.core.color,
  clarity: dimensions.clarity.color,
  connection: dimensions.connection.color,
  collaboration: dimensions.collaboration.color,
};

/**
 * Renders an inline SVG score ring for print.
 * No animations or transitions — purely static for PDF rendering.
 */
function PrintScoreRing({
  score,
  color,
  size = 56,
  strokeWidth = 5,
}: {
  score: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}): ReactElement {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score: ${Math.round(clamped)}%`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={greyscale[100]} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" style={{ fontSize: '12px', fontWeight: 600, fill: greyscale[700] }}>
        {Math.round(clamped)}
      </text>
    </svg>
  );
}

export function ExecutiveSummary({ payload }: ExecutiveSummaryProps): ReactElement {
  const { scores, compass, recommendations, branding } = payload;

  const criticalCount = recommendations.filter((r) => r.severity === 'critical').length;
  const highCount = recommendations.filter((r) => r.severity === 'high').length;

  return (
    <div className="report-page">
      <ReportPageHeader branding={branding} />

      <h2 className="report-section-title">Executive Summary</h2>

      {/* Overall score */}
      <div className="report-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <PrintScoreRing score={scores.overall} color={colors.core} size={72} strokeWidth={6} />
        <div>
          <p className="report-subtitle" style={{ marginBottom: '2px' }}>Overall Culture Score</p>
          <p className="report-body">{scores.overall}% — {compass.archetype}</p>
          <p style={{ fontSize: '9pt', color: greyscale[500], marginTop: '4px' }}>
            {compass.archetypeDescription}
          </p>
        </div>
      </div>

      {/* Dimension scores grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        {Object.entries(scores.dimensions).map(([dim, score]) => (
          <div
            key={dim}
            className="report-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderLeft: `4px solid ${DIMENSION_COLORS[dim] ?? greyscale[100]}`,
            }}
          >
            <PrintScoreRing score={score} color={DIMENSION_COLORS[dim] ?? greyscale[400]} size={48} strokeWidth={4} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '10pt', color: greyscale[900] }}>
                {DIMENSION_LABELS[dim] ?? dim}
              </p>
              <p style={{ fontSize: '9pt', color: greyscale[500] }}>{score}%</p>
            </div>
          </div>
        ))}
      </div>

      {/* Key findings */}
      {(criticalCount > 0 || highCount > 0) && (
        <div className="report-card">
          <p className="report-subtitle">Key Findings</p>
          <ul style={{ paddingLeft: '16px', fontSize: '10pt', color: greyscale[700] }}>
            {criticalCount > 0 && (
              <li style={{ marginBottom: '4px' }}>
                <strong style={{ color: severity.critical.border }}>{criticalCount}</strong> critical risk{criticalCount !== 1 ? 's' : ''} identified
              </li>
            )}
            {highCount > 0 && (
              <li>
                <strong style={{ color: severity.high.border }}>{highCount}</strong> high-priority area{highCount !== 1 ? 's' : ''} requiring attention
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

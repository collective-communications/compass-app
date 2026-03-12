/**
 * CompassOverview — static SVG compass visualization for PDF reports.
 * Renders the four-dimension compass as a non-interactive, print-ready graphic.
 *
 * This is a self-contained SVG — no external dependencies, no animations.
 * Dimensions are positioned in quadrants: Core (top-left), Clarity (top-right),
 * Connection (bottom-right), Collaboration (bottom-left).
 */

import type { ReactElement } from 'react';
import type { ReportPayload } from '@compass/types';
import { dimensions } from '@compass/tokens';
import { ReportPageHeader } from './report-layout';

interface CompassOverviewProps {
  payload: ReportPayload;
}

const DIMENSION_CONFIG = [
  { key: 'core', label: dimensions.core.label, color: dimensions.core.color, angle: 225 },
  { key: 'clarity', label: dimensions.clarity.label, color: dimensions.clarity.color, angle: 315 },
  { key: 'connection', label: dimensions.connection.label, color: dimensions.connection.color, angle: 45 },
  { key: 'collaboration', label: dimensions.collaboration.label, color: dimensions.collaboration.color, angle: 135 },
] as const;

const CENTER = 160;
const MAX_RADIUS = 130;
const RING_RADIUS = [40, 70, 100, 130]; // Concentric guide rings

/** Convert polar to cartesian for SVG positioning. */
function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/** Static compass SVG suitable for PDF embedding. */
function CompassSvg({
  dimensionPercentages,
  overallScore,
}: {
  dimensionPercentages: Record<string, number>;
  overallScore: number;
}): ReactElement {
  const size = CENTER * 2;

  // Build polygon points from dimension scores
  const points = DIMENSION_CONFIG.map(({ key, angle }) => {
    const pct = Math.max(0, Math.min(100, dimensionPercentages[key] ?? 0));
    const r = (pct / 100) * MAX_RADIUS;
    return polarToCartesian(CENTER, CENTER, r, angle);
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Culture compass visualization">
      {/* Guide rings */}
      {RING_RADIUS.map((r) => (
        <circle key={r} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="#E5E4E0" strokeWidth={0.5} />
      ))}

      {/* Axis lines */}
      {DIMENSION_CONFIG.map(({ key, angle }) => {
        const end = polarToCartesian(CENTER, CENTER, MAX_RADIUS, angle);
        return <line key={key} x1={CENTER} y1={CENTER} x2={end.x} y2={end.y} stroke="#E5E4E0" strokeWidth={0.5} />;
      })}

      {/* Score polygon */}
      <polygon points={polygonPoints} fill="rgba(10, 59, 79, 0.12)" stroke="#0A3B4F" strokeWidth={2} />

      {/* Score dots and labels on each axis */}
      {DIMENSION_CONFIG.map(({ key, label, color, angle }) => {
        const pct = Math.max(0, Math.min(100, dimensionPercentages[key] ?? 0));
        const r = (pct / 100) * MAX_RADIUS;
        const dot = polarToCartesian(CENTER, CENTER, r, angle);
        const labelPos = polarToCartesian(CENTER, CENTER, MAX_RADIUS + 18, angle);

        return (
          <g key={key}>
            <circle cx={dot.x} cy={dot.y} r={5} fill={color} />
            <text
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: '8px', fontWeight: 600, fill: '#424242' }}
            >
              {label}
            </text>
            <text
              x={labelPos.x}
              y={labelPos.y + 11}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: '7px', fill: '#757575' }}
            >
              {Math.round(pct)}%
            </text>
          </g>
        );
      })}

      {/* Center overall score */}
      <circle cx={CENTER} cy={CENTER} r={22} fill="#FFFFFF" stroke="#E5E4E0" strokeWidth={1} />
      <text
        x={CENTER}
        y={CENTER - 4}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: '14px', fontWeight: 700, fill: '#0A3B4F' }}
      >
        {Math.round(overallScore)}
      </text>
      <text
        x={CENTER}
        y={CENTER + 9}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: '6px', fill: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        Overall
      </text>
    </svg>
  );
}

export function CompassOverview({ payload }: CompassOverviewProps): ReactElement {
  const { scores, compass, branding } = payload;

  return (
    <div className="report-page">
      <ReportPageHeader branding={branding} />

      <h2 className="report-section-title">Compass Overview</h2>

      {/* Compass visualization centered */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
        <CompassSvg dimensionPercentages={compass.dimensionPercentages} overallScore={scores.overall} />
      </div>

      {/* Archetype card */}
      <div className="report-card" style={{ borderLeft: '4px solid #0A3B4F' }}>
        <p className="report-subtitle">{compass.archetype}</p>
        <p className="report-body">{compass.archetypeDescription}</p>
      </div>

      {/* Dimension summary table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '9pt',
          marginTop: '16px',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #E5E4E0' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#9E9E9E', fontWeight: 500 }}>Dimension</th>
            <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9E9E9E', fontWeight: 500 }}>Score</th>
          </tr>
        </thead>
        <tbody>
          {DIMENSION_CONFIG.map(({ key, label, color }) => {
            const dimScore = scores.dimensions[key] ?? 0;
            return (
              <tr key={key} style={{ borderBottom: '1px solid #F5F5F5' }}>
                <td style={{ padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                  {label}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>
                  {Math.round(dimScore)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

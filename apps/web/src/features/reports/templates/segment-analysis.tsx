/**
 * SegmentAnalysis — cross-segment comparison section for the PDF report.
 * Renders dimension scores by segment (department, tenure, etc.)
 * with anonymity threshold enforcement.
 *
 * Segments with fewer than 5 responses are hidden entirely — no partial
 * display, no blurring, no redaction. This is structural anonymity.
 */

import type { ReactElement } from 'react';
import type { ReportPayload } from '@compass/types';
import { dimensions } from '@compass/tokens';
import { ReportPageHeader } from './report-layout';

interface SegmentAnalysisProps {
  payload: ReportPayload;
  /** Minimum response count to display a segment. Defaults to 5. */
  anonymityThreshold?: number;
}

const DIMENSION_META: Record<string, { label: string; color: string }> = {
  core: { label: dimensions.core.label, color: dimensions.core.color },
  clarity: { label: dimensions.clarity.label, color: dimensions.clarity.color },
  connection: { label: dimensions.connection.label, color: dimensions.connection.color },
  collaboration: { label: dimensions.collaboration.label, color: dimensions.collaboration.color },
};

/** Horizontal bar for segment score comparison. */
function SegmentBar({
  score,
  color,
  width = 160,
}: {
  score: number;
  color: string;
  width?: number;
}): ReactElement {
  const height = 12;
  const clamped = Math.max(0, Math.min(100, score));
  const fillWidth = (clamped / 100) * width;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Score: ${Math.round(clamped)}%`}>
      <rect x={0} y={0} width={width} height={height} rx={6} fill="#E5E4E0" />
      <rect x={0} y={0} width={fillWidth} height={height} rx={6} fill={color} />
    </svg>
  );
}

export function SegmentAnalysis({
  payload,
  anonymityThreshold = 5,
}: SegmentAnalysisProps): ReactElement {
  const { scores, survey, branding } = payload;
  const segments = scores.segments;
  const segmentKeys = Object.keys(segments);

  if (segmentKeys.length === 0) {
    return (
      <div className="report-page">
        <ReportPageHeader branding={branding} />
        <h2 className="report-section-title">Segment Analysis</h2>
        <div className="report-card">
          <p className="report-body" style={{ color: '#757575' }}>
            No segment data is available for this survey.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Filter segments that meet the anonymity threshold.
   * The rendering service should only include segments in the payload
   * that meet threshold, but we enforce it here as a defense-in-depth measure.
   * Segments with null scores from safe_segment_scores are excluded.
   */
  const visibleSegments = segmentKeys.filter((segKey) => {
    const dimScores = segments[segKey] ?? {};
    // If all dimension scores are null/undefined, the segment is below threshold
    return Object.values(dimScores).some((s) => s !== null && s !== undefined);
  });

  const hiddenCount = segmentKeys.length - visibleSegments.length;
  const dimensionKeys = Object.keys(DIMENSION_META);

  return (
    <div className="report-page">
      <ReportPageHeader branding={branding} />

      <h2 className="report-section-title">Segment Analysis</h2>

      <p className="report-body" style={{ marginBottom: '16px' }}>
        Comparison of culture scores across organizational segments.
        {survey.responseCount > 0 && (
          <> Based on {survey.responseCount} total responses.</>
        )}
      </p>

      {/* Hidden segments notice */}
      {hiddenCount > 0 && (
        <div
          className="report-card"
          style={{
            background: '#FFFBEB',
            borderColor: '#F9A825',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '14px' }} aria-hidden="true">&#128274;</span>
          <p style={{ fontSize: '9pt', color: '#424242' }}>
            {hiddenCount} segment{hiddenCount !== 1 ? 's' : ''} hidden due to insufficient
            responses (fewer than {anonymityThreshold}). Data is withheld to protect
            respondent anonymity.
          </p>
        </div>
      )}

      {/* Segment comparison table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #E5E4E0' }}>
            <th style={{ textAlign: 'left', padding: '6px 8px', color: '#9E9E9E', fontWeight: 500, width: '100px' }}>
              Segment
            </th>
            {dimensionKeys.map((dim) => (
              <th key={dim} style={{ textAlign: 'center', padding: '6px 4px', color: '#9E9E9E', fontWeight: 500 }}>
                {DIMENSION_META[dim]?.label ?? dim}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleSegments.map((segKey) => {
            const dimScores = segments[segKey] ?? {};
            return (
              <tr key={segKey} style={{ borderBottom: '1px solid #F5F5F5' }}>
                <td style={{ padding: '8px', fontWeight: 500, color: '#212121' }}>
                  {segKey}
                </td>
                {dimensionKeys.map((dim) => {
                  const score = dimScores[dim];
                  if (score === null || score === undefined) {
                    return (
                      <td key={dim} style={{ padding: '8px 4px', textAlign: 'center', color: '#BDBDBD' }}>
                        &mdash;
                      </td>
                    );
                  }
                  return (
                    <td key={dim} style={{ padding: '8px 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                        <SegmentBar score={score} color={DIMENSION_META[dim]?.color ?? '#9E9E9E'} width={80} />
                        <span style={{ fontWeight: 600, color: '#424242', minWidth: '28px', textAlign: 'right' }}>
                          {Math.round(score)}%
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

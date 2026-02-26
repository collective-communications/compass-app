/**
 * RecommendationsSection — prioritized action items for the PDF report.
 * Renders recommendation cards sorted by severity with colored left borders.
 *
 * Severity border colors:
 * - Critical: #B71C1C (red)
 * - High: #E65100 (orange)
 * - Medium: #F9A825 (yellow)
 * - Healthy: #2E7D32 (green)
 */

import type { ReactElement } from 'react';
import type { ReportPayload } from '@compass/types';
import { ReportPageHeader } from './report-layout';

interface RecommendationsSectionProps {
  payload: ReportPayload;
}

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

const SEVERITY_ORDER: string[] = ['critical', 'high', 'medium', 'healthy'];

const DIMENSION_LABELS: Record<string, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
  system: 'System',
};

export function RecommendationsSection({ payload }: RecommendationsSectionProps): ReactElement {
  const { recommendations, branding } = payload;

  const sorted = [...recommendations].sort((a, b) => {
    const aIdx = SEVERITY_ORDER.indexOf(a.severity);
    const bIdx = SEVERITY_ORDER.indexOf(b.severity);
    return (aIdx === -1 ? SEVERITY_ORDER.length : aIdx) - (bIdx === -1 ? SEVERITY_ORDER.length : bIdx);
  });

  if (sorted.length === 0) {
    return (
      <div className="report-page">
        <ReportPageHeader branding={branding} />
        <h2 className="report-section-title">Recommendations</h2>
        <div className="report-card">
          <p className="report-body" style={{ color: '#757575' }}>
            No recommendations to display for this survey.
          </p>
        </div>
      </div>
    );
  }

  /* Group by severity for visual clarity in print */
  const grouped = SEVERITY_ORDER.reduce<Record<string, typeof sorted>>((acc, sev) => {
    const items = sorted.filter((r) => r.severity === sev);
    if (items.length > 0) {
      acc[sev] = items;
    }
    return acc;
  }, {});

  return (
    <div className="report-page">
      <ReportPageHeader branding={branding} />

      <h2 className="report-section-title">Recommendations</h2>

      <p className="report-body" style={{ marginBottom: '16px' }}>
        {sorted.length} recommendation{sorted.length !== 1 ? 's' : ''} identified,
        prioritized by severity.
      </p>

      {Object.entries(grouped).map(([severity, items]) => (
        <div key={severity} style={{ marginBottom: '20px' }}>
          {/* Severity group header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: SEVERITY_COLORS[severity],
              }}
            />
            <span style={{ fontSize: '11pt', fontWeight: 600, color: '#212121' }}>
              {SEVERITY_LABELS[severity] ?? severity}
            </span>
            <span style={{ fontSize: '9pt', color: '#9E9E9E' }}>
              ({items.length})
            </span>
          </div>

          {/* Recommendation cards */}
          {items.map((rec, idx) => (
            <div
              key={idx}
              className="report-card"
              style={{
                borderLeft: `4px solid ${SEVERITY_COLORS[rec.severity] ?? SEVERITY_COLORS.medium}`,
              }}
            >
              {/* Dimension badge */}
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '10px',
                  background: '#F5F5F5',
                  fontSize: '7pt',
                  fontWeight: 500,
                  color: '#757575',
                  marginBottom: '6px',
                }}
              >
                {DIMENSION_LABELS[rec.dimension] ?? rec.dimension}
              </span>

              <p style={{ fontWeight: 600, fontSize: '10pt', color: '#212121', marginBottom: '4px' }}>
                {rec.title}
              </p>

              <p style={{ fontSize: '9pt', color: '#616161', marginBottom: '8px', lineHeight: 1.5 }}>
                {rec.description}
              </p>

              {rec.actions.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <p style={{ fontSize: '8pt', fontWeight: 600, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    Actions
                  </p>
                  <ul style={{ paddingLeft: '14px', fontSize: '9pt', color: '#424242' }}>
                    {rec.actions.map((action, i) => (
                      <li key={i} style={{ marginBottom: '2px' }}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

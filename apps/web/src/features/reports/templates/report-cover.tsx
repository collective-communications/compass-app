/**
 * ReportCover — full-page cover for the PDF report.
 * Displays organization name, survey title, date range, and branding.
 */

import type { ReactElement } from 'react';
import type { ReportPayload } from '@compass/types';
import { formatDisplayDate } from '@compass/utils';

interface ReportCoverProps {
  payload: ReportPayload;
}

/**
 * Cover page — first page of the report. Full bleed with centered content,
 * brand colors, and organization identity.
 */
export function ReportCover({ payload }: ReportCoverProps): ReactElement {
  const { survey, branding, compass } = payload;

  return (
    <div
      className="report-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        minHeight: '253mm',
      }}
    >
      {/* Organization logo */}
      {branding.orgLogoUrl && (
        <img
          src={branding.orgLogoUrl}
          alt={`${survey.organizationName} logo`}
          style={{ maxHeight: '64px', maxWidth: '200px', marginBottom: '32px' }}
        />
      )}

      {/* Title block */}
      <h1
        style={{
          fontSize: '28pt',
          fontWeight: 700,
          color: '#0C3D50',
          marginBottom: '8px',
          lineHeight: 1.2,
        }}
      >
        Culture Report
      </h1>

      <p
        style={{
          fontSize: '16pt',
          fontWeight: 500,
          color: '#424242',
          marginBottom: '4px',
        }}
      >
        {survey.organizationName}
      </p>

      <p
        style={{
          fontSize: '11pt',
          color: '#757575',
          marginBottom: '40px',
        }}
      >
        {survey.title}
      </p>

      {/* Archetype badge */}
      <div
        style={{
          display: 'inline-block',
          padding: '8px 24px',
          borderRadius: '24px',
          background: '#F5F5F5',
          fontSize: '12pt',
          fontWeight: 600,
          color: '#0C3D50',
          marginBottom: '16px',
        }}
      >
        {compass.archetype}
      </div>

      {/* Metadata */}
      <p style={{ fontSize: '9pt', color: '#9E9E9E', marginBottom: '4px' }}>
        Survey closed {formatDisplayDate(survey.closesAt, 'long')}
      </p>
      <p style={{ fontSize: '9pt', color: '#9E9E9E' }}>
        {survey.responseCount} responses
      </p>

      {/* Bottom brand mark */}
      <div
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          textAlign: 'center',
          paddingBottom: '12mm',
        }}
      >
        {branding.cccLogoUrl ? (
          <img
            src={branding.cccLogoUrl}
            alt="COLLECTIVE culture + communication"
            style={{ maxHeight: '24px' }}
          />
        ) : (
          <span style={{ fontSize: '8pt', color: '#9E9E9E', letterSpacing: '0.05em' }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>COLLECTIVE</span>{' '}
            culture + communication
          </span>
        )}
      </div>
    </div>
  );
}

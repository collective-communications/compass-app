/**
 * ReportLayout — A4 page wrapper with branded header/footer for PDF generation.
 * Server-rendered to HTML, then captured by headless Chromium.
 *
 * Page size: 210mm x 297mm (A4).
 * Header: CC+C logo (left) + client org logo (right).
 * Footer: page number + "COLLECTIVE culture + communication".
 */

import type { ReactElement, ReactNode } from 'react';
import type { ReportPayload } from '@compass/types';
import { colors, greyscale, severity } from '@compass/tokens';

interface ReportLayoutProps {
  payload: ReportPayload;
  children: ReactNode;
}

/**
 * Root layout wrapping all report sections. Provides @page print rules,
 * a repeating branded header, and a page-numbered footer.
 */
export function ReportLayout({ payload, children }: ReportLayoutProps): ReactElement {
  const { survey } = payload;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=210mm" />
        <title>{survey.title} — Culture Report</title>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @page {
                size: A4;
                margin: 20mm 16mm 24mm 16mm;
              }

              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }

              html, body {
                font-family: 'DM Sans', 'Calibri', Arial, sans-serif;
                font-size: 10pt;
                line-height: 1.5;
                color: ${greyscale[700]};
                background: #FFFFFF;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              .report-page {
                page-break-after: always;
                position: relative;
                min-height: 253mm; /* 297mm - 20mm top - 24mm bottom */
              }

              .report-page:last-child {
                page-break-after: auto;
              }

              .report-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 8mm;
                border-bottom: 1px solid ${greyscale[100]};
                margin-bottom: 8mm;
              }

              .report-header img {
                max-height: 28px;
                max-width: 120px;
                object-fit: contain;
              }

              .report-footer {
                position: fixed;
                bottom: 0;
                left: 16mm;
                right: 16mm;
                border-top: 1px solid ${greyscale[100]};
                padding-top: 4mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 7pt;
                color: ${greyscale[400]};
              }

              .report-footer .brand-mark {
                letter-spacing: 0.05em;
              }

              .report-footer .brand-mark .collective {
                text-transform: uppercase;
                font-weight: 600;
              }

              /* Utility classes for report sections */
              .report-card {
                background: #FFFFFF;
                border: 1px solid ${greyscale[100]};
                border-radius: 8px;
                padding: 20px 24px;
                margin-bottom: 16px;
              }

              .report-section-title {
                font-size: 16pt;
                font-weight: 700;
                color: ${colors.core};
                margin-bottom: 12px;
              }

              .report-subtitle {
                font-size: 12pt;
                font-weight: 600;
                color: ${greyscale[900]};
                margin-bottom: 8px;
              }

              .report-body {
                font-size: 10pt;
                color: ${greyscale[700]};
                line-height: 1.6;
              }

              .severity-border-critical { border-left: 4px solid ${severity.critical.border}; }
              .severity-border-high { border-left: 4px solid ${severity.high.border}; }
              .severity-border-medium { border-left: 4px solid ${severity.medium.border}; }
              .severity-border-healthy { border-left: 4px solid ${severity.healthy.border}; }

              @media print {
                .report-footer {
                  position: running(footer);
                }
              }
            `,
          }}
        />
      </head>
      <body>
        {/* Repeating footer — rendered once, positioned by print CSS */}
        <div className="report-footer">
          <span className="brand-mark">
            <span className="collective">COLLECTIVE</span> culture + communication
          </span>
          {/* Page number counter is injected by Chromium print engine */}
          <span className="page-number" />
        </div>

        {children}
      </body>
    </html>
  );
}

/**
 * ReportPageHeader — branded header rendered at the top of each page section.
 * Rendered inline per section since CSS running headers have limited browser support.
 */
export function ReportPageHeader({
  branding,
}: {
  branding: ReportPayload['branding'];
}): ReactElement {
  return (
    <div className="report-header">
      {branding.cccLogoUrl ? (
        <img src={branding.cccLogoUrl} alt="COLLECTIVE culture + communication" />
      ) : (
        <span style={{ fontWeight: 700, fontSize: '10pt', color: colors.core }}>
          <span style={{ textTransform: 'uppercase' }}>COLLECTIVE</span>{' '}
          culture + communication
        </span>
      )}
      {branding.orgLogoUrl && (
        <img src={branding.orgLogoUrl} alt="Organization logo" />
      )}
    </div>
  );
}

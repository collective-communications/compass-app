/**
 * A4-optimized CSS styles for the HTML report renderer.
 * Inline styles for self-contained HTML output ready for PDF conversion.
 */

import { BRAND } from './tokens.ts';

export function getStyles(): string {
  return `
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: ${BRAND.textPrimary};
      background: ${BRAND.white};
    }

    .page-break {
      page-break-before: always;
    }

    .cover {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 257mm;
      text-align: center;
      padding: 40mm 20mm;
    }

    .cover-logo {
      font-size: 14pt;
      font-weight: 600;
      color: ${BRAND.core};
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 60px;
    }

    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      color: ${BRAND.core};
      margin-bottom: 16px;
      line-height: 1.2;
    }

    .cover-subtitle {
      font-size: 16pt;
      color: ${BRAND.textSecondary};
      margin-bottom: 40px;
    }

    .cover-meta {
      font-size: 10pt;
      color: ${BRAND.midGrey};
    }

    .cover-divider {
      width: 80px;
      height: 3px;
      background: ${BRAND.clarity};
      margin: 30px auto;
    }

    section {
      padding: 0 0 24px 0;
    }

    h2 {
      font-size: 20pt;
      font-weight: 700;
      color: ${BRAND.core};
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid ${BRAND.border};
    }

    h3 {
      font-size: 14pt;
      font-weight: 600;
      color: ${BRAND.darkGrey};
      margin: 20px 0 8px;
    }

    p {
      margin-bottom: 10px;
    }

    .card {
      background: ${BRAND.white};
      border: 1px solid ${BRAND.border};
      border-radius: 8px;
      padding: 20px 24px;
      margin-bottom: 16px;
    }

    .card-bordered {
      border-left-width: 4px;
    }

    .score-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin: 16px 0;
    }

    .score-card {
      background: ${BRAND.lightGrey};
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .score-value {
      font-size: 28pt;
      font-weight: 700;
      color: ${BRAND.core};
    }

    .score-label {
      font-size: 9pt;
      color: ${BRAND.textSecondary};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    .bar-container {
      background: ${BRAND.lightGrey};
      border-radius: 4px;
      height: 12px;
      width: 100%;
      margin: 6px 0 4px;
    }

    .bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }

    .dimension-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid ${BRAND.lightGrey};
    }

    .dimension-label {
      width: 140px;
      font-weight: 600;
      font-size: 10pt;
    }

    .dimension-bar {
      flex: 1;
    }

    .dimension-score {
      width: 60px;
      text-align: right;
      font-weight: 600;
      font-size: 10pt;
    }

    .rec-card {
      border-left-width: 4px;
      border-left-style: solid;
      margin-bottom: 12px;
    }

    .rec-title {
      font-weight: 600;
      font-size: 12pt;
      margin-bottom: 4px;
    }

    .rec-severity {
      display: inline-block;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 8px;
    }

    .rec-actions {
      margin-top: 8px;
      padding-left: 20px;
    }

    .rec-actions li {
      margin-bottom: 4px;
      font-size: 10pt;
    }

    .segment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin: 16px 0;
    }

    .segment-table th {
      background: ${BRAND.core};
      color: ${BRAND.white};
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
    }

    .segment-table td {
      padding: 8px 12px;
      border-bottom: 1px solid ${BRAND.border};
    }

    .segment-table tr:nth-child(even) td {
      background: ${BRAND.lightGrey};
    }

    .footer {
      text-align: center;
      font-size: 8pt;
      color: ${BRAND.midGrey};
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid ${BRAND.border};
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page-break { page-break-before: always; }
    }
  `;
}

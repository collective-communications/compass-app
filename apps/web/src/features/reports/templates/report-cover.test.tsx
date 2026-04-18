import { describe, test, expect, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { ReportCover } from './report-cover';
import type { ReportPayload } from '@compass/types';

/**
 * Snapshot-lite tests for ReportCover — assert that the survey title,
 * organization name, archetype badge, and response count surface on the
 * cover. Also cover the branding-fallback path when no logo URL is provided.
 */

function makePayload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    survey: {
      id: 'survey-1',
      title: 'Q1 Culture Assessment',
      organizationName: 'Acme Corp',
      closesAt: '2026-04-01',
      responseCount: 42,
    },
    scores: {
      overall: 72,
      dimensions: { core: 72, clarity: 61, connection: 55, collaboration: 48 },
      segments: {},
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription: 'Prioritizes relationship-building.',
      dimensionPercentages: { core: 72, clarity: 61, connection: 55, collaboration: 48 },
    },
    recommendations: [],
    branding: {
      orgLogoUrl: 'https://example.com/acme-logo.png',
      cccLogoUrl: null,
      colors: { primary: '#0A3B4F' },
    },
    sections: [],
    ...overrides,
  };
}

afterEach(cleanup);

describe('ReportCover', () => {
  test('renders the organization name', () => {
    render(<ReportCover payload={makePayload()} />);
    expect(screen.getByText('Acme Corp')).toBeTruthy();
  });

  test('renders the survey title', () => {
    render(<ReportCover payload={makePayload()} />);
    expect(screen.getByText('Q1 Culture Assessment')).toBeTruthy();
  });

  test('renders the archetype badge', () => {
    render(<ReportCover payload={makePayload()} />);
    expect(screen.getByText('The Connector')).toBeTruthy();
  });

  test('renders the "Culture Report" headline', () => {
    render(<ReportCover payload={makePayload()} />);
    expect(screen.getByText('Culture Report')).toBeTruthy();
  });

  test('renders the response count line', () => {
    render(<ReportCover payload={makePayload()} />);
    expect(screen.getByText('42 responses')).toBeTruthy();
  });

  test('uses the organization logo when provided', () => {
    render(<ReportCover payload={makePayload()} />);
    const img = screen.getByAltText('Acme Corp logo') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('acme-logo.png');
  });

  test('falls back to brand word-mark when orgLogoUrl is null', () => {
    const payload = makePayload({
      branding: { orgLogoUrl: null, cccLogoUrl: null, colors: {} },
    });
    render(<ReportCover payload={payload} />);
    // No logo image but the COLLECTIVE wordmark appears in the footer
    expect(screen.queryByAltText('Acme Corp logo')).toBeNull();
    expect(screen.getByText('COLLECTIVE')).toBeTruthy();
    expect(screen.getByText(/culture \+ communication/)).toBeTruthy();
  });

  test('uses the CC+C logo in the footer when cccLogoUrl is present', () => {
    const payload = makePayload({
      branding: {
        orgLogoUrl: null,
        cccLogoUrl: 'https://example.com/ccc.png',
        colors: {},
      },
    });
    render(<ReportCover payload={payload} />);
    const ccc = screen.getByAltText('COLLECTIVE culture + communication') as HTMLImageElement;
    expect(ccc).toBeTruthy();
    expect(ccc.src).toContain('ccc.png');
  });
});

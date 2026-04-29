/**
 * Tests for the PPTX renderer and slide builders.
 *
 * These tests run under bun:test and import pptxgenjs from npm (installed as
 * a devDependency) rather than the esm.sh URL used by the Deno edge function.
 * The slide builder functions in pptx-sections.ts are pure TypeScript with no
 * esm.sh imports, so they can be tested directly.
 */

import { describe, test, expect } from 'bun:test';
import PptxGenJS from 'pptxgenjs';
import {
  addCoverSlide,
  addExecutiveSummarySlide,
  addCompassOverviewSlide,
  addDimensionDeepDiveSlides,
  addSegmentAnalysisSlides,
  addRecommendationSlides,
} from './pptx-sections';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const MOCK_REPORT = {
  id: 'rpt-001',
  survey_id: 'srv-001',
  organization_id: 'org-001',
  title: 'Q4 2025 Culture Assessment',
  format: 'pptx',
  status: 'queued',
  storage_path: null,
  sections: null,
  client_visible: false,
  triggered_by: 'usr-001',
  created_at: '2025-12-01T00:00:00Z',
  updated_at: '2025-12-01T00:00:00Z',
};

function buildMockPayload(overrides?: {
  sections?: Array<{ id: string; label: string; included: boolean }>;
  dimensions?: Record<string, number>;
  segments?: Record<string, Record<string, number>>;
  recommendations?: Array<{
    dimension: string;
    severity: string;
    title: string;
    description: string;
    actions: string[];
  }>;
}) {
  return {
    survey: {
      id: 'srv-001',
      title: 'Culture Pulse Q4',
      organizationName: 'Acme Corp',
      closesAt: '2025-12-31',
      responseCount: 142,
    },
    scores: {
      overall: 3.25,
      dimensions: overrides?.dimensions ?? {
        clarity: 3.5,
        connection: 3.1,
        collaboration: 2.9,
        culture: 3.4,
        communication: 3.2,
        community: 3.0,
      },
      segments: overrides?.segments ?? {
        'department:Engineering': { clarity: 3.6, connection: 3.2, collaboration: 3.0 },
        'department:Marketing': { clarity: 3.3, connection: 3.5, collaboration: 2.8 },
      },
    },
    compass: {
      archetype: 'The Connector',
      archetypeDescription: 'Organizations with this archetype excel at building bridges between teams.',
      dimensionPercentages: {
        clarity: 87.5,
        connection: 77.5,
        collaboration: 72.5,
        culture: 85.0,
        communication: 80.0,
        community: 75.0,
      },
    },
    recommendations: overrides?.recommendations ?? [
      {
        dimension: 'collaboration',
        severity: 'high',
        title: 'Improve cross-team collaboration rituals',
        description: 'Teams report siloed decision-making processes.',
        actions: ['Establish weekly cross-functional standups', 'Create shared Slack channels'],
      },
      {
        dimension: 'community',
        severity: 'medium',
        title: 'Strengthen community engagement',
        description: 'Community scores lag behind other dimensions.',
        actions: ['Launch monthly town halls', 'Create mentorship program'],
      },
      {
        dimension: 'connection',
        severity: 'healthy',
        title: 'Maintain strong connection practices',
        description: 'Connection is performing well — sustain current initiatives.',
        actions: [],
      },
    ],
    branding: {
      orgLogoUrl: null,
      cccLogoUrl: null,
      colors: {},
    },
    sections: overrides?.sections,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Create a fresh PptxGenJS instance with the same setup as render-pptx.ts. */
function createPresentation(): InstanceType<typeof PptxGenJS> {
  const pres = new PptxGenJS();
  pres.layout = 'LAYOUT_16x9';

  pres.defineSlideMaster({
    title: 'COMPASS_MASTER',
    background: { fill: 'FFFFFF' },
    objects: [
      {
        line: {
          x: 0.5, y: 5.1, w: 9, h: 0,
          line: { color: 'E5E4E0', width: 0.75 },
        },
      },
      {
        text: {
          text: 'COLLECTIVE culture + communication',
          options: { x: 0.5, y: 5.2, w: 5, h: 0.3, fontSize: 8, color: '9E9E9E', fontFace: 'Arial' },
        },
      },
      {
        text: {
          text: 'Confidential',
          options: { x: 5.5, y: 5.2, w: 4, h: 0.3, fontSize: 8, color: '9E9E9E', fontFace: 'Arial', align: 'right' },
        },
      },
    ],
  });

  return pres;
}

/** Generate the PPTX arraybuffer from a fully built presentation. */
async function generateBuffer(pres: InstanceType<typeof PptxGenJS>): Promise<Uint8Array> {
  const result = await pres.write({ outputType: 'arraybuffer' });
  return new Uint8Array(result as ArrayBuffer);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PptxRenderer', () => {
  describe('full presentation generation', () => {
    test('produces a non-empty Uint8Array', async () => {
      const pres = createPresentation();
      const payload = buildMockPayload();

      addCoverSlide(pres, payload, MOCK_REPORT);
      addExecutiveSummarySlide(pres, payload);
      addCompassOverviewSlide(pres, payload);
      addDimensionDeepDiveSlides(pres, payload);
      addSegmentAnalysisSlides(pres, payload);
      addRecommendationSlides(pres, payload);

      const buffer = await generateBuffer(pres);

      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(buffer.byteLength).toBeGreaterThan(0);
    });

    test('output starts with ZIP magic bytes (PPTX is a ZIP container)', async () => {
      const pres = createPresentation();
      const payload = buildMockPayload();

      addCoverSlide(pres, payload, MOCK_REPORT);
      addExecutiveSummarySlide(pres, payload);

      const buffer = await generateBuffer(pres);

      // ZIP magic bytes: PK\x03\x04
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });
  });

  describe('section filtering', () => {
    test('all sections included produces slides for every section', async () => {
      const pres = createPresentation();
      const payload = buildMockPayload();

      addCoverSlide(pres, payload, MOCK_REPORT);
      addExecutiveSummarySlide(pres, payload);
      addCompassOverviewSlide(pres, payload);
      addDimensionDeepDiveSlides(pres, payload);
      addSegmentAnalysisSlides(pres, payload);
      addRecommendationSlides(pres, payload);

      const allBuffer = await generateBuffer(pres);

      // With 6 dimensions + cover + exec summary + compass + segments + recs = many slides
      // The buffer should be substantial
      expect(allBuffer.byteLength).toBeGreaterThan(10000);
    });

    test('excluding sections produces a smaller file', async () => {
      // Full presentation
      const presFull = createPresentation();
      const payloadFull = buildMockPayload();
      addCoverSlide(presFull, payloadFull, MOCK_REPORT);
      addExecutiveSummarySlide(presFull, payloadFull);
      addCompassOverviewSlide(presFull, payloadFull);
      addDimensionDeepDiveSlides(presFull, payloadFull);
      addSegmentAnalysisSlides(presFull, payloadFull);
      addRecommendationSlides(presFull, payloadFull);
      const fullBuffer = await generateBuffer(presFull);

      // Minimal presentation — only cover and exec summary
      const presMinimal = createPresentation();
      const payloadMinimal = buildMockPayload({
        sections: [
          { id: 'cover', label: 'Cover', included: true },
          { id: 'executive_summary', label: 'Executive Summary', included: true },
          { id: 'compass_overview', label: 'Compass Overview', included: false },
          { id: 'dimension_deep_dives', label: 'Dimension Deep Dives', included: false },
          { id: 'segment_analysis', label: 'Segment Analysis', included: false },
          { id: 'recommendations', label: 'Recommendations', included: false },
        ],
      });
      addCoverSlide(presMinimal, payloadMinimal, MOCK_REPORT);
      addExecutiveSummarySlide(presMinimal, payloadMinimal);
      addCompassOverviewSlide(presMinimal, payloadMinimal);
      addDimensionDeepDiveSlides(presMinimal, payloadMinimal);
      addSegmentAnalysisSlides(presMinimal, payloadMinimal);
      addRecommendationSlides(presMinimal, payloadMinimal);
      const minimalBuffer = await generateBuffer(presMinimal);

      expect(minimalBuffer.byteLength).toBeLessThan(fullBuffer.byteLength);
    });

    test('excluded section adds zero slides', async () => {
      const pres = createPresentation();
      const payload = buildMockPayload({
        sections: [
          { id: 'cover', label: 'Cover', included: false },
          { id: 'executive_summary', label: 'Executive Summary', included: false },
          { id: 'compass_overview', label: 'Compass Overview', included: false },
          { id: 'dimension_deep_dives', label: 'Dimension Deep Dives', included: false },
          { id: 'segment_analysis', label: 'Segment Analysis', included: false },
          { id: 'recommendations', label: 'Recommendations', included: false },
        ],
      });

      addCoverSlide(pres, payload, MOCK_REPORT);
      addExecutiveSummarySlide(pres, payload);
      addCompassOverviewSlide(pres, payload);
      addDimensionDeepDiveSlides(pres, payload);
      addSegmentAnalysisSlides(pres, payload);
      addRecommendationSlides(pres, payload);

      // PptxGenJS requires at least one slide to write — it auto-adds a blank one
      // The buffer should still be valid but minimal
      const buffer = await generateBuffer(pres);
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });
  });

  describe('slide builders', () => {
    test('addCoverSlide does not throw', () => {
      const pres = createPresentation();
      const payload = buildMockPayload();
      expect(() => addCoverSlide(pres, payload, MOCK_REPORT)).not.toThrow();
    });

    test('addExecutiveSummarySlide handles empty dimensions', () => {
      const pres = createPresentation();
      const payload = buildMockPayload({ dimensions: {} });
      expect(() => addExecutiveSummarySlide(pres, payload)).not.toThrow();
    });

    test('addCompassOverviewSlide does not throw', () => {
      const pres = createPresentation();
      const payload = buildMockPayload();
      expect(() => addCompassOverviewSlide(pres, payload)).not.toThrow();
    });

    test('addDimensionDeepDiveSlides handles empty dimensions', () => {
      const pres = createPresentation();
      const payload = buildMockPayload({ dimensions: {} });
      expect(() => addDimensionDeepDiveSlides(pres, payload)).not.toThrow();
    });

    test('addSegmentAnalysisSlides handles empty segments', () => {
      const pres = createPresentation();
      const payload = buildMockPayload({ segments: {} });
      expect(() => addSegmentAnalysisSlides(pres, payload)).not.toThrow();
    });

    test('addRecommendationSlides handles empty recommendations', () => {
      const pres = createPresentation();
      const payload = buildMockPayload({ recommendations: [] });
      expect(() => addRecommendationSlides(pres, payload)).not.toThrow();
    });

    test('addSegmentAnalysisSlides paginates many segments', () => {
      const manySegments: Record<string, Record<string, number>> = {};
      for (let i = 0; i < 20; i++) {
        manySegments[`department:Team ${i}`] = { clarity: 3.0 + (i % 10) * 0.1 };
      }
      const pres = createPresentation();
      const payload = buildMockPayload({ segments: manySegments });
      expect(() => addSegmentAnalysisSlides(pres, payload)).not.toThrow();
    });

    test('addRecommendationSlides paginates many recommendations', () => {
      const manyRecs = Array.from({ length: 12 }, (_, i) => ({
        dimension: 'clarity',
        severity: i % 3 === 0 ? 'critical' : i % 3 === 1 ? 'high' : 'medium',
        title: `Recommendation ${i + 1}`,
        description: `Description for recommendation ${i + 1}.`,
        actions: [`Action A for ${i + 1}`, `Action B for ${i + 1}`],
      }));

      const pres = createPresentation();
      const payload = buildMockPayload({ recommendations: manyRecs });
      expect(() => addRecommendationSlides(pres, payload)).not.toThrow();
    });
  });
});

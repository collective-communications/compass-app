/**
 * Sync test: edge-function brand tokens must match @compass/tokens.
 *
 * The generate-report edge function runs in Deno and cannot import workspace
 * packages, so it duplicates colour values in two places:
 *   - supabase/functions/generate-report/tokens.ts  (BRAND, SEVERITY_COLORS)
 *   - supabase/functions/generate-report/_lib.ts    (BRAND)
 *
 * This test guards those duplications against drift from the canonical source
 * (@compass/tokens). If it fails, update the edge files to match — do not
 * update the canonical values from here.
 */
import { describe, test, expect } from 'bun:test';
import { colors, greyscale, severity } from '@compass/tokens';
import { BRAND as EDGE_BRAND, SEVERITY_COLORS as EDGE_SEVERITY } from '../../../../supabase/functions/generate-report/tokens';
import { BRAND as LIB_BRAND } from '../../../../supabase/functions/generate-report/_lib';

describe('generate-report/tokens.ts BRAND parity with @compass/tokens', () => {
  test('core matches', () => {
    expect(EDGE_BRAND.core).toBe(colors.core);
  });

  test('clarity matches', () => {
    expect(EDGE_BRAND.clarity).toBe(colors.clarity);
  });

  test('connection matches', () => {
    expect(EDGE_BRAND.connection).toBe(colors.connection);
  });

  test('collaboration matches', () => {
    expect(EDGE_BRAND.collaboration).toBe(colors.collaboration);
  });

  test('lightGrey matches greyscale 50', () => {
    expect(EDGE_BRAND.lightGrey).toBe(greyscale[50]);
  });

  test('midGrey matches greyscale 400', () => {
    expect(EDGE_BRAND.midGrey).toBe(greyscale[400]);
  });

  test('darkGrey matches greyscale 700', () => {
    expect(EDGE_BRAND.darkGrey).toBe(greyscale[700]);
  });

  test('textPrimary matches greyscale 900', () => {
    expect(EDGE_BRAND.textPrimary).toBe(greyscale[900]);
  });

  test('border matches greyscale 100', () => {
    expect(EDGE_BRAND.border).toBe(greyscale[100]);
  });
});

describe('generate-report/tokens.ts SEVERITY_COLORS parity with @compass/tokens', () => {
  test('critical matches severity.critical.border', () => {
    expect(EDGE_SEVERITY.critical).toBe(severity.critical.border);
  });

  test('high matches severity.high.border', () => {
    expect(EDGE_SEVERITY.high).toBe(severity.high.border);
  });

  test('medium matches severity.medium.border', () => {
    expect(EDGE_SEVERITY.medium).toBe(severity.medium.border);
  });

  test('healthy matches severity.healthy.border', () => {
    expect(EDGE_SEVERITY.healthy).toBe(severity.healthy.border);
  });
});

describe('generate-report/_lib.ts BRAND parity with @compass/tokens', () => {
  test('core matches', () => {
    expect(LIB_BRAND.core).toBe(colors.core);
  });

  test('clarity matches', () => {
    expect(LIB_BRAND.clarity).toBe(colors.clarity);
  });

  test('connection matches', () => {
    expect(LIB_BRAND.connection).toBe(colors.connection);
  });

  test('collaboration matches', () => {
    expect(LIB_BRAND.collaboration).toBe(colors.collaboration);
  });
});

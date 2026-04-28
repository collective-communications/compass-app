import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for the Scoring Validator dev tool at /dev/scoring.
 *
 * No storageState required — this route is unauthenticated and only available
 * in development builds (import.meta.env.DEV === true).
 */

const PRESETS = {
  alignedThriving: 'aligned-thriving',
  busyBurnedOut: 'busy-burned-out',
  commandControl: 'command-control',
} as const;

async function loadPreset(page: Page, presetId: string): Promise<void> {
  await page.locator('select').first().selectOption(presetId);
}

async function visibleScoreValues(page: Page): Promise<number[]> {
  const scoreText = await page.locator('text=/\\d+\\.\\d{2}%/').allTextContents();
  return scoreText
    .map((text) => Number.parseFloat(text.replace('%', '')))
    .filter((value) => Number.isFinite(value));
}

test.describe('Scoring Validator — /dev/scoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/scoring');
    // Wait for the tool to fully load: header and initial score cards both visible
    await expect(page.getByText('Scoring Validator')).toBeVisible({ timeout: 10000 });
  });

  // ── Initial load ─────────────────────────────────────────────────────────

  test('page loads with header and DEV badge', async ({ page }) => {
    await expect(page.getByText('Scoring Validator')).toBeVisible();
    await expect(page.getByText('DEV')).toBeVisible();
  });

  test('four dimension labels visible in compass preview', async ({ page }) => {
    // Dimension labels are rendered in the CompassPreview score cards (all caps spans).
    // Use locator with filter to target only the <span> elements (avoids SVG text and option nodes).
    await expect(page.locator('span').filter({ hasText: /^CORE$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^CLARITY$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^CONNECTION$/ })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: /^COLLABORATION$/ })).toBeVisible();
  });

  test('tab bar shows Scores, Archetypes, Risk Flags, Trust Ladder', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Scores' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Archetypes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Risk Flags' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trust Ladder' })).toBeVisible();
  });

  test('Compare tab is not visible before enabling compare mode', async ({ page }) => {
    // Use exact match so the ⇄ Compare toggle button does not match
    await expect(page.getByRole('button', { name: 'Compare', exact: true })).not.toBeVisible();
  });

  // ── Preset loading ────────────────────────────────────────────────────────

  test('loading Aligned & Thriving preset shows healthy scores', async ({ page }) => {
    await loadPreset(page, PRESETS.alignedThriving);

    await expect(page.getByText('healthy').first()).toBeVisible({ timeout: 5000 });
    const scores = await visibleScoreValues(page);
    expect(scores.some((score) => score > 70)).toBe(true);
  });

  test('loading Busy but Burned Out preset shows low scores', async ({ page }) => {
    await loadPreset(page, PRESETS.busyBurnedOut);

    await expect(page.getByText('broken').first()).toBeVisible({ timeout: 5000 });
    const scores = await visibleScoreValues(page);
    expect(scores.some((score) => score < 50)).toBe(true);
  });

  test('Reset button restores midpoint scores after a preset', async ({ page }) => {
    await loadPreset(page, PRESETS.alignedThriving);
    await expect(page.getByText('healthy').first()).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Reset' }).click();

    await expect(page.locator('select').first()).toHaveValue('');
    await expect(page.getByText('healthy').first()).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/\\d+\\.\\d{2}%/').first()).toBeVisible({ timeout: 5000 });
  });

  test('Command & Control preset renders without errors', async ({ page }) => {
    await loadPreset(page, PRESETS.commandControl);

    await expect(page.locator('span').filter({ hasText: /^CORE$/ })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/\\d+\\.\\d{2}%/').first()).toBeVisible({ timeout: 5000 });
  });

  // ── Scale toggle ──────────────────────────────────────────────────────────

  test('switching from 5pt to 4pt changes score values', async ({ page }) => {
    const initialScores = await visibleScoreValues(page);

    await page.getByRole('button', { name: '4pt' }).click();

    await expect(page.getByRole('button', { name: '4pt' })).toHaveAttribute('aria-pressed', 'true');
    const updatedScores = await visibleScoreValues(page);
    expect(updatedScores.join(',')).not.toBe(initialScores.join(','));
  });

  test('5pt button is active by default and can be restored after toggling', async ({ page }) => {
    await expect(page.getByRole('button', { name: '5pt' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: '4pt' }).click();
    await expect(page.getByRole('button', { name: '4pt' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: '5pt' }).click();
    await expect(page.getByRole('button', { name: '5pt' })).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Tab navigation ────────────────────────────────────────────────────────

  test('Archetypes tab shows distance table with archetype names', async ({ page }) => {
    await page.getByRole('button', { name: 'Archetypes' }).click();

    // At least two of the generated archetype names should appear in the distance table.
    const archetypeNames = [
      'Aligned & Thriving',
      'Command & Control',
      'Well-Intentioned but Disconnected',
      'Over-Collaborated',
      'Busy but Burned Out',
    ];
    const distanceTable = page.getByRole('table');
    let found = 0;
    for (const name of archetypeNames) {
      const visible = await distanceTable.getByText(name).first().isVisible().catch(() => false);
      if (visible) found++;
    }
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('Archetypes tab shows confidence badges', async ({ page }) => {
    await page.getByRole('button', { name: 'Archetypes' }).click();
    // At least one confidence badge (STRONG, MODERATE, or WEAK) must appear
    const strongVisible = await page.getByText('STRONG').first().isVisible({ timeout: 3000 }).catch(() => false);
    const moderateVisible = await page.getByText('MODERATE').first().isVisible({ timeout: 3000 }).catch(() => false);
    const weakVisible = await page.getByText('WEAK').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(strongVisible || moderateVisible || weakVisible).toBe(true);
  });

  test('Risk Flags tab shows threshold inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Risk Flags' }).click();
    // The ThresholdPanel renders three labeled number inputs
    await expect(page.getByText('Thresholds')).toBeVisible({ timeout: 5000 });
    // At least one threshold input field should be present
    const inputs = page.locator('input[type="number"]');
    await expect(inputs.first()).toBeVisible({ timeout: 5000 });
  });

  test('Risk Flags tab with Busy but Burned Out preset shows critical flags', async ({ page }) => {
    await loadPreset(page, PRESETS.busyBurnedOut);
    await page.getByRole('button', { name: 'Risk Flags' }).click();

    await expect(page.getByText('CRITICAL').first()).toBeVisible({ timeout: 5000 });
  });

  test('Risk Flags tab with Aligned & Thriving preset shows no active flags', async ({ page }) => {
    await loadPreset(page, PRESETS.alignedThriving);
    await page.getByRole('button', { name: 'Risk Flags' }).click();

    await expect(
      page.getByText('No active risk flags — all dimensions healthy.'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Trust Ladder tab shows rung names', async ({ page }) => {
    await page.getByRole('button', { name: 'Trust Ladder' }).click();
    // Rungs 1 and 2 are always Core: Purpose and Values
    await expect(page.getByText('Purpose').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Values').first()).toBeVisible({ timeout: 5000 });
  });

  test('Trust Ladder tab shows Current Level label', async ({ page }) => {
    await page.getByRole('button', { name: 'Trust Ladder' }).click();
    await expect(page.getByText('Current Level')).toBeVisible({ timeout: 5000 });
  });

  test('Trust Ladder tab with Aligned & Thriving shows all rungs achieved', async ({ page }) => {
    await loadPreset(page, PRESETS.alignedThriving);
    await page.getByRole('button', { name: 'Trust Ladder' }).click();

    await expect(page.getByText('All rungs achieved')).toBeVisible({ timeout: 5000 });
  });

  // ── Compare mode ──────────────────────────────────────────────────────────

  test('Compare toggle makes Compare tab appear', async ({ page }) => {
    // Before toggling, Compare tab button (exact label) should not be in the tab bar.
    // The toggle button is "⇄ Compare"; the tab is "Compare" (exact).
    await expect(page.getByRole('button', { name: 'Compare', exact: true })).not.toBeVisible();

    // Enable compare mode via the toggle button
    await page.getByRole('button', { name: /⇄ Compare/ }).click();

    // Compare tab should now appear in the tab bar (exact match to avoid matching the toggle)
    await expect(page.getByRole('button', { name: 'Compare', exact: true })).toBeVisible({ timeout: 3000 });
  });

  test('Compare tab activates automatically when compare mode is enabled', async ({ page }) => {
    await page.getByRole('button', { name: /⇄ Compare/ }).click();
    // After enabling compare mode, the active tab switches to Compare automatically.
    // The ComparePanel renders a "Scenario B:" label.
    await expect(page.getByText('Scenario B:').first()).toBeVisible({ timeout: 5000 });
  });

  test('Compare tab shows comparison table immediately after enabling compare mode', async ({ page }) => {
    // When compare mode is enabled, Scenario B is pre-seeded from the current Scenario A answers.
    // The comparison table renders immediately (no empty state) because outputsB is non-null.
    await page.getByRole('button', { name: /⇄ Compare/ }).click();
    // The Scenario B preset selector should be present
    await expect(page.getByText('Scenario B:').first()).toBeVisible({ timeout: 5000 });
    // The comparison table shows the delta section headings
    await expect(page.getByText('Archetype').first()).toBeVisible({ timeout: 5000 });
  });

  test('Compare tab shows delta table after loading Scenario B preset', async ({ page }) => {
    await page.getByRole('button', { name: /⇄ Compare/ }).click();
    // Navigate to Compare tab if it is not already active
    const compareTab = page.getByRole('button', { name: 'Compare', exact: true });
    if (await compareTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await compareTab.click();
    }

    // The ComparePanel has its own select for Scenario B.
    await page.getByText('Scenario B:').first().waitFor({ timeout: 5000 });
    const selects = page.locator('select');
    // First select is the Scenario A preset in ConfigBar; second is the Scenario B select
    await selects.nth(1).selectOption(PRESETS.busyBurnedOut);

    // Comparison table column headers should appear
    await expect(page.getByRole('columnheader', { name: 'Scenario A' })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('columnheader', { name: 'Scenario B' })).toBeVisible({ timeout: 5000 });
  });

  test('disabling compare mode removes Compare tab', async ({ page }) => {
    // Enable compare
    await page.getByRole('button', { name: /⇄ Compare/ }).click();
    await expect(
      page.getByRole('button', { name: 'Compare', exact: true }),
    ).toBeVisible({ timeout: 3000 });

    // Disable compare
    await page.getByRole('button', { name: /⇄ Compare/ }).click();
    await expect(
      page.getByRole('button', { name: 'Compare', exact: true }),
    ).not.toBeVisible({ timeout: 3000 });
  });
});

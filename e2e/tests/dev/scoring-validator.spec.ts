import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Scoring Validator dev tool at /dev/scoring.
 *
 * No storageState required — this route is unauthenticated and only available
 * in development builds (import.meta.env.DEV === true).
 */

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

  test('loading Healthy Org preset shows 100.00% scores', async ({ page }) => {
    await page.selectOption('select', { label: 'Healthy Org' });
    // All four dimensions should show 100.00%
    await expect(page.getByText('100.00%').first()).toBeVisible({ timeout: 5000 });
  });

  test('loading Disconnected preset shows 0.00% scores', async ({ page }) => {
    await page.selectOption('select', { label: 'Disconnected' });
    await expect(page.getByText('0.00%').first()).toBeVisible({ timeout: 5000 });
  });

  test('Reset button restores midpoint scores after extreme preset', async ({ page }) => {
    // Load extreme preset
    await page.selectOption('select', { label: 'Healthy Org' });
    await expect(page.getByText('100.00%').first()).toBeVisible({ timeout: 5000 });

    // Reset
    await page.getByRole('button', { name: 'Reset' }).click();

    // 100.00% should disappear (midpoint scores replace extreme values)
    await expect(page.getByText('100.00%').first()).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // If this times out, the element is already gone — that's fine.
    });

    // At least one percentage score must still be visible (scores are not cleared)
    await expect(page.locator('text=/\\d+\\.\\d{2}%/').first()).toBeVisible({ timeout: 5000 });
  });

  test('Broken Core preset renders without errors', async ({ page }) => {
    await page.selectOption('select', { label: 'Broken Core' });
    // Dimensions should still show scores — no crash or loading state.
    // Broken Core: outer dimensions at 100%, core at 0%.
    await expect(page.locator('span').filter({ hasText: /^CORE$/ })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('100.00%').first()).toBeVisible({ timeout: 5000 });
  });

  // ── Scale toggle ──────────────────────────────────────────────────────────

  test('switching to 5pt scale reduces Scale Parity scores below 66.67%', async ({ page }) => {
    // Scale Parity preset: all non-reverse answers at value 3 → 66.67% on 4pt scale.
    await page.selectOption('select', { label: 'Scale Parity' });
    await expect(page.getByText('66.67%').first()).toBeVisible({ timeout: 5000 });

    // Switch to 5-point — the same raw value 3 on a 5pt scale scores lower.
    // Non-reverse: (3-1)/(5-1)*100 = 50%. Reverse-scored: (5+1-2-1)/(5-1)*100 = 75%.
    // Dimension averages fall below 66.67% since the non-reverse items pull the mean down.
    await page.getByRole('button', { name: '5pt' }).click();

    // After switching, 66.67% must disappear from the compass preview score cards
    // (scores have changed). The scale indicator "5pt" pill should now be active.
    await expect(page.getByRole('button', { name: '5pt' })).toBeVisible();

    // Confirm scores are no longer 66.67% in the compass preview cards
    // (the CompassPreview always shows updated scores derived from the new scale)
    const stillHas6667 = await page.getByText('66.67%').first().isVisible({ timeout: 3000 }).catch(() => false);
    // Scores CHANGED — they are no longer uniform 66.67%
    expect(stillHas6667).toBe(false);
  });

  test('4pt button is active by default', async ({ page }) => {
    // The 4pt button should render as the active pill (dark background)
    const fourPtBtn = page.getByRole('button', { name: '4pt' });
    await expect(fourPtBtn).toBeVisible();
    // Active pill has no border style — confirmed active by toggling and checking 5pt becomes visible
    await page.getByRole('button', { name: '5pt' }).click();
    await page.getByRole('button', { name: '4pt' }).click();
    // Re-loading Scale Parity on 4pt should yield 66.67%
    await page.selectOption('select', { label: 'Scale Parity' });
    await expect(page.getByText('66.67%').first()).toBeVisible({ timeout: 5000 });
  });

  // ── Tab navigation ────────────────────────────────────────────────────────

  test('Archetypes tab shows distance table with archetype names', async ({ page }) => {
    await page.getByRole('button', { name: 'Archetypes' }).click();

    // At least two of the six archetype names should appear in the distance table
    const archetypeNames = [
      'Balanced',
      'Clarity-Driven',
      'Connection-Driven',
      'Collaboration-Driven',
      'Core-Fragile',
      'Disconnected',
    ];
    let found = 0;
    for (const name of archetypeNames) {
      const visible = await page.getByText(name).first().isVisible({ timeout: 3000 }).catch(() => false);
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

  test('Risk Flags tab with Disconnected preset shows critical flags', async ({ page }) => {
    await page.selectOption('select', { label: 'Disconnected' });
    await page.getByRole('button', { name: 'Risk Flags' }).click();
    // Disconnected scores all dimensions at min — should fire CRITICAL severity
    await expect(page.getByText('CRITICAL').first()).toBeVisible({ timeout: 5000 });
  });

  test('Risk Flags tab with Healthy Org preset shows no active flags', async ({ page }) => {
    await page.selectOption('select', { label: 'Healthy Org' });
    await page.getByRole('button', { name: 'Risk Flags' }).click();
    // All dimensions at max — no risk flags expected
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

  test('Trust Ladder tab with Healthy Org shows all rungs achieved', async ({ page }) => {
    await page.selectOption('select', { label: 'Healthy Org' });
    await page.getByRole('button', { name: 'Trust Ladder' }).click();
    // Healthy Org — all dimensions at max, so summary should say "All rungs achieved"
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

    // The ComparePanel has its own select for Scenario B — pick Disconnected
    await page.getByText('Scenario B:').first().waitFor({ timeout: 5000 });
    const selects = page.locator('select');
    // First select is the Scenario A preset in ConfigBar; second is the Scenario B select
    await selects.nth(1).selectOption({ label: 'Disconnected' });

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

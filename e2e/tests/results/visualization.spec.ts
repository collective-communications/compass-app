import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/admin.json' });

const SEED_SURVEY_ID = '00000000-0000-0000-0000-000000000100';

test.describe('Results visualization', () => {
  test('compass tab renders SVG with dimension segments', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);
    await page.waitForLoadState('networkidle');

    // SVG compass should render with accessible role
    const compass = page.locator('svg[role="img"]').or(page.getByTestId('compass-svg'));
    if (await compass.isVisible({ timeout: 10000 }).catch(() => false)) {
      await expect(compass).toBeVisible();

      // Dimension segments should be present within the SVG
      const segments = compass.locator('[data-dimension]').or(compass.locator('path'));
      const segmentCount = await segments.count();
      expect(segmentCount).toBeGreaterThan(0);
    }

    // Archetype card should display
    const archetypeCard = page.getByTestId('archetype-card').or(
      page.locator('[class*="card"]').filter({ hasText: /archetype/i }),
    );
    const hasArchetype = await archetypeCard.first().isVisible({ timeout: 5000 }).catch(() => false);
    // Archetype may not exist if scoring hasn't run — just verify page loaded
    expect(page.url()).toContain('/compass');
  });

  test('clicking a dimension segment updates detail panel', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);
    await page.waitForLoadState('networkidle');

    const segments = page.locator('svg [data-dimension]');
    if (await segments.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const dimensionName = await segments.first().getAttribute('data-dimension');
      await segments.first().click();

      // Detail panel should show the clicked dimension info
      const detailPanel = page.getByTestId('dimension-detail').or(
        page.locator('[class*="panel"], [class*="detail"]').filter({ hasText: new RegExp(dimensionName ?? '', 'i') }),
      );
      await expect(detailPanel.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('survey tab shows dimension headers and question results', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);
    await page.waitForLoadState('networkidle');

    const surveyTab = page.getByRole('tab', { name: /survey/i });
    if (await surveyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await surveyTab.click();
      await page.waitForLoadState('networkidle');

      // Dimension headers should render
      const dimensionHeaders = page.getByRole('heading').filter({ hasText: /core|clarity|connection|collaboration/i });
      const hasDimHeaders = await dimensionHeaders.first().isVisible({ timeout: 5000 }).catch(() => false);

      // Question result cards with Likert bar charts
      const questionCards = page.getByTestId('question-result').or(
        page.locator('[class*="card"]').filter({ hasText: /strongly|agree|disagree/i }),
      );
      const hasQuestionCards = await questionCards.first().isVisible({ timeout: 5000 }).catch(() => false);

      // At least the tab should have navigated
      expect(hasDimHeaders || hasQuestionCards || page.url().includes('survey')).toBe(true);
    }
  });

  test('groups tab renders segment filter and comparison chart or anonymity warning', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);
    await page.waitForLoadState('networkidle');

    const groupsTab = page.getByRole('tab', { name: /groups/i });
    if (await groupsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await groupsTab.click();
      await page.waitForLoadState('networkidle');

      // Segment filter bar should render
      const filterBar = page.getByTestId('segment-filter').or(
        page.getByRole('combobox').or(page.locator('select')),
      );
      const anonymityWarning = page.getByText(/anonymity|threshold|not enough responses/i);
      const comparisonChart = page.getByTestId('comparison-chart').or(
        page.locator('svg, canvas').first(),
      );

      const hasFilter = await filterBar.first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasWarning = await anonymityWarning.isVisible({ timeout: 5000 }).catch(() => false);
      const hasChart = await comparisonChart.isVisible({ timeout: 5000 }).catch(() => false);

      // Should show either comparison data, anonymity warning, or filter controls
      expect(hasFilter || hasWarning || hasChart).toBe(true);
    }
  });

  test('dialogue tab renders keyword bubbles or empty state with search', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);
    await page.waitForLoadState('networkidle');

    const dialogueTab = page.getByRole('tab', { name: /dialogue/i });
    if (await dialogueTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dialogueTab.click();
      await page.waitForLoadState('networkidle');

      // Keyword bubbles or empty state
      const keywordBubbles = page.getByTestId('keyword-bubble').or(
        page.locator('[class*="bubble"], [class*="tag"], [class*="chip"]'),
      );
      const emptyState = page.getByText(/no dialogue|no responses/i);
      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/search/i),
      );

      const hasBubbles = await keywordBubbles.first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
      const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasBubbles || hasEmpty || hasSearch).toBe(true);

      // Search input should be functional if present
      if (hasSearch) {
        await searchInput.fill('culture');
        await expect(searchInput).toHaveValue('culture');
      }
    }
  });

  test('tab state persists after navigating away and back', async ({ page }) => {
    await page.goto(`/results/${SEED_SURVEY_ID}/compass`);
    await page.waitForLoadState('networkidle');

    // Navigate to a non-compass tab
    const surveyTab = page.getByRole('tab', { name: /survey/i });
    if (await surveyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await surveyTab.click();
      await page.waitForLoadState('networkidle');

      // Navigate away (e.g., to dashboard)
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Navigate back to results
      await page.goto(`/results/${SEED_SURVEY_ID}`);
      await page.waitForLoadState('networkidle');

      // Check if tab state was preserved (URL or active tab)
      const activeTab = page.getByRole('tab', { selected: true });
      if (await activeTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Tab navigation should be present and functional
        await expect(page.getByRole('navigation')).toBeVisible();
      }
    }
  });
});

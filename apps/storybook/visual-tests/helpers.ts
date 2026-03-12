export const THEMES = ['light', 'dark'] as const;

export function storyUrl(storyId: string, theme: string): string {
  return `/iframe.html?id=${storyId}&globals=theme:${theme}`;
}

/** Wait for story to render and stabilize */
export async function waitForStoryReady(page: import('@playwright/test').Page): Promise<void> {
  // Wait for Storybook to render the story
  await page.waitForLoadState('networkidle');
  // Allow CSS transitions and fonts to settle
  await page.waitForTimeout(300);
}

export const screenshotMatrix = {
  themes: ['light', 'dark'] as const,
  viewports: [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'desktop', width: 1280, height: 800 },
  ] as const,
};

export const diffOptions = {
  maxDiffPixelRatio: 0.001, // 0.1% threshold
  animations: 'disabled' as const,
  stylePath: [] as string[], // Additional CSS to inject
};

/**
 * Generate screenshot name for baseline storage.
 * Format: {storyId}--{theme}--{viewport}.png
 */
export function screenshotName(
  storyId: string,
  theme: string,
  viewport: string,
): string {
  return `${storyId}--${theme}--${viewport}.png`;
}

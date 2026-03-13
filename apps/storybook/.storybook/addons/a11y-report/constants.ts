/** Addon identifiers and channel event names. */
export const ADDON_ID = 'compass/a11y-report';
export const PANEL_ID = `${ADDON_ID}/panel`;

/**
 * Channel events from @storybook/addon-a11y.
 * We listen to these — we don't emit them.
 */
export const A11Y_EVENTS = {
  RESULT: 'storybook/a11y/result',
  MANUAL: 'storybook/a11y/manual',
  RUNNING: 'storybook/a11y/running',
  ERROR: 'storybook/a11y/error',
} as const;

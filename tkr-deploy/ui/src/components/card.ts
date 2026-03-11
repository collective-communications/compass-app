export interface CardOptions {
  borderColor?: string;
  severity?: 'healthy' | 'warning' | 'error';
}

/**
 * Create a card container element.
 */
export function createCard(options?: CardOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'card';

  if (options?.severity) {
    el.classList.add(`card--${options.severity}`);
  } else if (options?.borderColor) {
    el.classList.add('card--accent');
    el.style.borderLeftColor = options.borderColor;
  }

  return el;
}

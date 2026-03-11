export interface CardOptions {
  borderColor?: string;
}

/**
 * Create a card container element.
 */
export function createCard(options?: CardOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'card';

  if (options?.borderColor) {
    el.classList.add('card--accent');
    el.style.borderLeftColor = options.borderColor;
  }

  return el;
}

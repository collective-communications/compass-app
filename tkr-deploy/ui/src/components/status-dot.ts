export type DotStatus = 'healthy' | 'warning' | 'unknown';

/**
 * Create a status dot with label.
 */
export function createStatusDot(status: DotStatus, label: string): HTMLElement {
  const wrapper = document.createElement('span');
  wrapper.className = 'status-dot';

  const circle = document.createElement('span');
  circle.className = `status-dot__circle status-dot__circle--${status}`;
  circle.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.textContent = label;

  wrapper.appendChild(circle);
  wrapper.appendChild(text);
  return wrapper;
}

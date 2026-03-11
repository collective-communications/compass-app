export interface ProgressBarOptions {
  value: number;
  max: number;
}

export interface ProgressBarElement extends HTMLElement {
  update(value: number, max: number): void;
}

/**
 * Create an accessible progress bar with an update method.
 */
export function createProgressBar(options: ProgressBarOptions): ProgressBarElement {
  const wrapper = document.createElement('div') as unknown as ProgressBarElement;
  wrapper.className = 'progress-bar';
  wrapper.setAttribute('role', 'progressbar');
  wrapper.setAttribute('aria-valuemin', '0');

  const fill = document.createElement('div');
  fill.className = 'progress-bar__fill';
  wrapper.appendChild(fill);

  function applyValues(value: number, max: number): void {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    fill.style.width = `${pct}%`;
    wrapper.setAttribute('aria-valuenow', String(value));
    wrapper.setAttribute('aria-valuemax', String(max));
    wrapper.setAttribute('aria-label', `${Math.round(pct)}% complete`);
  }

  wrapper.update = (value: number, max: number): void => {
    applyValues(value, max);
  };

  applyValues(options.value, options.max);
  return wrapper;
}

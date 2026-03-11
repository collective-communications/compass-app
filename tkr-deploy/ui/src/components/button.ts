export interface ButtonOptions {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: (e: MouseEvent) => void | Promise<void>;
}

/**
 * Create a button with optional async onClick that shows a spinner.
 */
export function createButton(label: string, options?: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  const variant = options?.variant ?? 'primary';
  btn.className = `btn btn--${variant}`;
  btn.disabled = options?.disabled ?? false;

  const labelSpan = document.createElement('span');
  labelSpan.className = 'btn__label';
  labelSpan.textContent = label;
  btn.appendChild(labelSpan);

  if (options?.onClick) {
    const handler = options.onClick;
    btn.addEventListener('click', (e: MouseEvent) => {
      const result = handler(e);
      if (result instanceof Promise) {
        btn.disabled = true;
        btn.classList.add('btn--loading');

        const spinner = document.createElement('span');
        spinner.className = 'btn__spinner';
        btn.appendChild(spinner);

        result.finally(() => {
          btn.disabled = false;
          btn.classList.remove('btn--loading');
          spinner.remove();
        });
      }
    });
  }

  return btn;
}

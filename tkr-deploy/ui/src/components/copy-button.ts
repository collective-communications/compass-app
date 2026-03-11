/**
 * Create a copy-to-clipboard button with aria-live feedback.
 */
export function createCopyButton(getText: () => string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn btn--secondary';
  btn.setAttribute('aria-label', 'Copy to clipboard');

  const label = document.createElement('span');
  label.className = 'btn__label';
  label.textContent = 'Copy';
  btn.appendChild(label);

  const liveRegion = document.createElement('span');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('role', 'status');
  liveRegion.style.position = 'absolute';
  liveRegion.style.width = '1px';
  liveRegion.style.height = '1px';
  liveRegion.style.overflow = 'hidden';
  liveRegion.style.clip = 'rect(0,0,0,0)';
  btn.appendChild(liveRegion);

  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getText());
      label.textContent = 'Copied';
      liveRegion.textContent = 'Copied to clipboard';
      setTimeout(() => {
        label.textContent = 'Copy';
        liveRegion.textContent = '';
      }, 2000);
    } catch {
      label.textContent = 'Failed';
      liveRegion.textContent = 'Copy failed';
      setTimeout(() => {
        label.textContent = 'Copy';
        liveRegion.textContent = '';
      }, 2000);
    }
  });

  return btn;
}

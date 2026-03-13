import { navigate, getCurrentPath } from './router.js';
import { createStatusDot, type DotStatus } from './components/status-dot.js';
import { createThemeToggle } from './components/theme-toggle.js';

export interface NavItem {
  label: string;
  path: string;
}

export interface ShellHandle {
  contentArea: HTMLElement;
  updateVaultStatus: (status: DotStatus, label: string) => void;
  updateActivePill: (path: string) => void;
}

/**
 * Render the application shell: topbar, pill nav, and content area.
 * Nav items are passed in (from manifest) rather than hardcoded.
 */
export function renderShell(
  root: HTMLElement,
  navItems: NavItem[],
  dashboardName: string = 'tkr-deploy',
): ShellHandle {
  root.innerHTML = '';

  // Topbar
  const topbar = document.createElement('header');
  topbar.className = 'shell-topbar';

  const wordmark = document.createElement('span');
  wordmark.className = 'shell-topbar__wordmark';
  wordmark.textContent = dashboardName;
  topbar.appendChild(wordmark);

  const rightGroup = document.createElement('div');
  rightGroup.style.display = 'flex';
  rightGroup.style.alignItems = 'center';
  rightGroup.style.gap = 'var(--space-md)';

  createThemeToggle(rightGroup);

  const vaultLink = document.createElement('a');
  vaultLink.href = 'http://localhost:42042';
  vaultLink.target = '_blank';
  vaultLink.rel = 'noopener noreferrer';
  vaultLink.className = 'shell-topbar__vault-status';
  vaultLink.style.textDecoration = 'none';
  vaultLink.style.color = 'inherit';
  let vaultDot = createStatusDot('unknown', 'Vault: checking...');
  vaultLink.appendChild(vaultDot);
  rightGroup.appendChild(vaultLink);

  topbar.appendChild(rightGroup);

  // Pill nav
  const nav = document.createElement('nav');
  nav.className = 'shell-pillnav';
  nav.setAttribute('aria-label', 'Main navigation');

  const pills: HTMLAnchorElement[] = [];
  for (const item of navItems) {
    const pill = document.createElement('a');
    pill.className = 'shell-pill';
    pill.href = item.path;
    pill.textContent = item.label;

    if (item.path === getCurrentPath()) {
      pill.setAttribute('aria-current', 'page');
    }

    pill.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      void navigate(item.path);
    });

    pills.push(pill);
    nav.appendChild(pill);
  }

  // Content
  const content = document.createElement('main');
  content.className = 'shell-content';
  content.id = 'main-content';

  root.appendChild(topbar);
  root.appendChild(nav);
  root.appendChild(content);

  return {
    contentArea: content,

    updateVaultStatus(status: DotStatus, label: string): void {
      vaultLink.innerHTML = '';
      vaultDot = createStatusDot(status, `Vault: ${label}`);
      vaultLink.appendChild(vaultDot);
    },

    updateActivePill(path: string): void {
      for (const pill of pills) {
        if (pill.getAttribute('href') === path) {
          pill.setAttribute('aria-current', 'page');
        } else {
          pill.removeAttribute('aria-current');
        }
      }
    },
  };
}

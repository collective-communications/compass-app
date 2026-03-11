import { navigate, getCurrentPath } from './router.js';
import { createStatusDot, type DotStatus } from './components/status-dot.js';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview',  path: '/' },
  { label: 'Secrets',   path: '/secrets' },
  { label: 'Database',  path: '/database' },
  { label: 'Frontend',  path: '/frontend' },
  { label: 'Email',     path: '/email' },
  { label: 'CI/CD',     path: '/cicd' },
];

export interface ShellHandle {
  contentArea: HTMLElement;
  updateVaultStatus: (status: DotStatus, label: string) => void;
  updateActivePill: (path: string) => void;
}

/**
 * Render the application shell: topbar, pill nav, and content area.
 */
export function renderShell(root: HTMLElement): ShellHandle {
  root.innerHTML = '';

  // Topbar
  const topbar = document.createElement('header');
  topbar.className = 'shell-topbar';

  const wordmark = document.createElement('span');
  wordmark.className = 'shell-topbar__wordmark';
  wordmark.textContent = 'tkr-deploy';
  topbar.appendChild(wordmark);

  const vaultContainer = document.createElement('div');
  vaultContainer.className = 'shell-topbar__vault-status';
  let vaultDot = createStatusDot('unknown', 'Vault: checking...');
  vaultContainer.appendChild(vaultDot);
  topbar.appendChild(vaultContainer);

  // Pill nav
  const nav = document.createElement('nav');
  nav.className = 'shell-pillnav';
  nav.setAttribute('aria-label', 'Main navigation');

  const pills: HTMLAnchorElement[] = [];
  for (const item of NAV_ITEMS) {
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
      vaultContainer.innerHTML = '';
      vaultDot = createStatusDot(status, `Vault: ${label}`);
      vaultContainer.appendChild(vaultDot);
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

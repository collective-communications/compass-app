import { createCard } from '../components/card.js';
import { createStatusDot, type DotStatus } from '../components/status-dot.js';
import { createButton } from '../components/button.js';
import { apiFetch } from '../api.js';

// ── Types ──

interface MigrationItem {
  name: string;
  applied: boolean;
}

interface MigrationsData {
  applied: number;
  total: number;
  migrations: MigrationItem[];
}

interface EdgeFunction {
  name: string;
  deployed: boolean;
  missingSecrets?: string[];
}

interface FunctionsData {
  deployed: number;
  total: number;
  functions: EdgeFunction[];
}

interface ExtensionData {
  pgvector: 'enabled' | 'available' | 'unavailable';
}

interface HealthData {
  status: 'connected' | 'disconnected';
  projectRef: string;
  region: string;
  version: string;
}

// ── State ──

let container: HTMLElement | null = null;
let abortController: AbortController | null = null;

// ── Helpers ──

function createSkeleton(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'skeleton';
  el.style.height = '120px';
  el.style.borderRadius = 'var(--radius-card)';
  el.style.background = 'var(--color-border)';
  el.style.animation = 'pulse 1.5s ease-in-out infinite';
  return el;
}

function createBadge(text: string, variant: 'default' | 'healthy' | 'warning' | 'error' = 'default'): HTMLElement {
  const badge = document.createElement('span');
  badge.textContent = text;
  badge.style.display = 'inline-block';
  badge.style.padding = '2px 8px';
  badge.style.borderRadius = 'var(--radius-pill)';
  badge.style.fontSize = 'var(--font-size-sm)';
  badge.style.fontWeight = '500';
  if (variant !== 'default') {
    badge.className = `badge--${variant}`;
  } else {
    badge.style.background = 'var(--color-border)';
    badge.style.color = 'var(--color-text-secondary)';
  }
  return badge;
}

function createCardHeader(title: string, badge?: HTMLElement, action?: HTMLButtonElement): HTMLElement {
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.marginBottom = 'var(--space-md)';
  header.style.flexWrap = 'wrap';
  header.style.gap = 'var(--space-sm)';

  const left = document.createElement('div');
  left.style.display = 'flex';
  left.style.alignItems = 'center';
  left.style.gap = 'var(--space-sm)';

  const h2 = document.createElement('h2');
  h2.textContent = title;
  h2.style.margin = '0';
  h2.style.fontSize = 'var(--font-size-lg)';
  h2.style.fontWeight = '600';
  left.appendChild(h2);

  if (badge) left.appendChild(badge);
  header.appendChild(left);
  if (action) header.appendChild(action);
  return header;
}

function createDl(entries: Array<{ label: string; value: string | HTMLElement }>): HTMLElement {
  const dl = document.createElement('dl');
  dl.style.margin = '0';
  dl.style.display = 'grid';
  dl.style.gridTemplateColumns = 'auto 1fr';
  dl.style.gap = 'var(--space-sm) var(--space-md)';
  dl.style.fontSize = 'var(--font-size-sm)';

  for (const entry of entries) {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    dt.style.color = 'var(--color-text-muted)';
    dt.style.fontWeight = '500';
    dl.appendChild(dt);

    const dd = document.createElement('dd');
    dd.style.margin = '0';
    if (typeof entry.value === 'string') {
      dd.textContent = entry.value;
    } else {
      dd.appendChild(entry.value);
    }
    dl.appendChild(dd);
  }
  return dl;
}

// ── Card Builders ──

function buildConnectionCard(data: HealthData): HTMLElement {
  const isConnected = data.status === 'connected';
  const card = createCard(isConnected ? { severity: 'healthy' } : { severity: 'error' });
  const dotStatus: DotStatus = isConnected ? 'healthy' : 'error';
  const dot = createStatusDot(dotStatus, isConnected ? 'Connected' : 'Disconnected');

  const header = createCardHeader('Connection Status');
  card.appendChild(header);
  card.appendChild(dot);

  const statusBadge = createBadge(isConnected ? 'Online' : 'Offline',
    isConnected ? 'healthy' : 'error');

  const dl = createDl([
    { label: 'Project Ref', value: data.projectRef },
    { label: 'Region', value: data.region },
    { label: 'DB Version', value: data.version },
    { label: 'Status', value: statusBadge },
  ]);
  dl.style.marginTop = 'var(--space-md)';
  card.appendChild(dl);
  return card;
}

function buildMigrationsCard(data: MigrationsData, disabled: boolean): HTMLElement {
  const card = createCard();
  const pending = data.total - data.applied;
  const badge = createBadge(`${data.applied}/${data.total} applied`);

  const pushBtn = createButton('Push Pending', {
    variant: 'primary',
    disabled: disabled || pending === 0,
    onClick: async () => {
      await apiFetch('/api/database/migrations/push', { method: 'POST' });
    },
  });
  if (pending === 0) {
    pushBtn.setAttribute('aria-disabled', 'true');
  }

  const header = createCardHeader('Migrations', badge, pushBtn);
  card.appendChild(header);

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = 'var(--space-sm)';

  // Show last 4 applied + all pending
  const applied = data.migrations.filter(m => m.applied).slice(-4);
  const pendingMigs = data.migrations.filter(m => !m.applied);
  const visible = [...applied, ...pendingMigs];

  for (const mig of visible) {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = 'var(--space-sm)';
    li.style.padding = 'var(--space-sm)';
    li.style.fontSize = 'var(--font-size-sm)';
    li.style.borderRadius = 'var(--radius-button)';

    if (!mig.applied) {
      li.style.borderLeft = '3px solid var(--color-status-warning)';
      li.style.paddingLeft = 'var(--space-md)';
    } else {
      li.style.color = 'var(--color-text-muted)';
    }

    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = mig.applied ? '\u2713' : '\u25CB';
    icon.style.flexShrink = '0';
    li.appendChild(icon);

    const name = document.createElement('span');
    name.textContent = mig.name;
    li.appendChild(name);

    list.appendChild(li);
  }

  card.appendChild(list);
  return card;
}

function buildFunctionsCard(data: FunctionsData, disabled: boolean): HTMLElement {
  const card = createCard();
  const badge = createBadge(`${data.deployed}/${data.total} deployed`);
  const allDeployed = data.deployed === data.total;

  const deployAllBtn = createButton('Deploy All', {
    variant: 'primary',
    disabled: disabled || allDeployed,
    onClick: async () => {
      await apiFetch('/api/database/functions/deploy-all', { method: 'POST' });
    },
  });
  if (allDeployed) {
    deployAllBtn.setAttribute('aria-disabled', 'true');
  }

  const header = createCardHeader('Edge Functions', badge, deployAllBtn);
  card.appendChild(header);

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = 'var(--space-sm)';

  for (const fn of data.functions) {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.padding = 'var(--space-sm)';
    li.style.fontSize = 'var(--font-size-sm)';
    li.style.flexWrap = 'wrap';
    li.style.gap = 'var(--space-sm)';

    const nameSpan = document.createElement('span');
    nameSpan.style.display = 'flex';
    nameSpan.style.alignItems = 'center';
    nameSpan.style.gap = 'var(--space-sm)';

    const statusIcon = document.createElement('span');
    statusIcon.setAttribute('aria-hidden', 'true');
    statusIcon.textContent = fn.deployed ? '\u2713' : '\u25CB';
    nameSpan.appendChild(statusIcon);

    const label = document.createElement('span');
    label.textContent = fn.name;
    nameSpan.appendChild(label);

    li.appendChild(nameSpan);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = 'var(--space-sm)';

    if (fn.missingSecrets && fn.missingSecrets.length > 0) {
      const note = document.createElement('span');
      note.textContent = `Missing: ${fn.missingSecrets.join(', ')}`;
      note.style.color = 'var(--color-text-muted)';
      note.style.fontSize = 'var(--font-size-sm)';
      right.appendChild(note);
    }

    if (!fn.deployed) {
      const deployBtn = createButton('Deploy', {
        variant: 'secondary',
        disabled,
        onClick: async () => {
          await apiFetch(`/api/database/functions/${encodeURIComponent(fn.name)}/deploy`, { method: 'POST' });
        },
      });
      right.appendChild(deployBtn);
    }

    li.appendChild(right);
    list.appendChild(li);
  }

  card.appendChild(list);
  return card;
}

function buildPgvectorCard(data: ExtensionData, disabled: boolean): HTMLElement {
  const card = createCard();
  const statusText = data.pgvector === 'enabled' ? 'Enabled'
    : data.pgvector === 'available' ? 'Available'
    : 'Unavailable';
  const badge = createBadge(statusText, data.pgvector === 'enabled' ? 'healthy' : 'default');

  const header = createCardHeader('pgvector', badge);

  if (data.pgvector === 'available') {
    const enableBtn = createButton('Enable', {
      variant: 'primary',
      disabled,
      onClick: async () => {
        await apiFetch('/api/database/extensions/pgvector/enable', { method: 'POST' });
      },
    });
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'space-between';
    wrapper.style.marginBottom = 'var(--space-md)';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.gap = 'var(--space-sm)';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = 'var(--space-sm)';

    const h2 = document.createElement('h2');
    h2.textContent = 'pgvector';
    h2.style.margin = '0';
    h2.style.fontSize = 'var(--font-size-lg)';
    h2.style.fontWeight = '600';
    left.appendChild(h2);
    left.appendChild(badge);
    wrapper.appendChild(left);
    wrapper.appendChild(enableBtn);
    card.appendChild(wrapper);
  } else {
    card.appendChild(header);
  }

  const desc = document.createElement('p');
  desc.style.margin = '0';
  desc.style.fontSize = 'var(--font-size-sm)';
  desc.style.color = 'var(--color-text-secondary)';
  desc.textContent = data.pgvector === 'enabled'
    ? 'Vector similarity search is active.'
    : data.pgvector === 'available'
    ? 'Extension is available but not yet enabled on this project.'
    : 'Extension is not available for this project.';
  card.appendChild(desc);

  return card;
}

// ── Main ──

export function render(target: HTMLElement): void {
  container = target;
  abortController = new AbortController();
  const signal = abortController.signal;

  const heading = document.createElement('h1');
  heading.className = 'screen-heading';
  heading.textContent = 'Database';
  container.appendChild(heading);

  // Grid container
  const grid = document.createElement('div');
  grid.className = 'db-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr';
  grid.style.gap = 'var(--space-md)';
  container.appendChild(grid);

  // Add responsive style
  const style = document.createElement('style');
  style.textContent = `
    @media (min-width: 768px) {
      .db-grid { grid-template-columns: 1fr 1fr !important; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  container.appendChild(style);

  // 4 skeleton slots
  const slots: HTMLElement[] = [];
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.appendChild(createSkeleton());
    grid.appendChild(slot);
    slots.push(slot);
  }

  // Parallel fetches
  const healthP = apiFetch<HealthData>('/api/database/health', { signal });
  const migrationsP = apiFetch<MigrationsData>('/api/database/migrations', { signal });
  const functionsP = apiFetch<FunctionsData>('/api/database/functions', { signal });
  const extensionsP = apiFetch<ExtensionData>('/api/database/extensions', { signal });

  // Resolve each independently
  healthP.then(data => {
    if (signal.aborted) return;
    const dbDisconnected = data.status !== 'connected';
    slots[0].innerHTML = '';
    slots[0].appendChild(buildConnectionCard(data));

    // Once health resolves, update action cards if they already rendered
    updateDisabledState(grid, dbDisconnected);
  }).catch(err => {
    if (signal.aborted) return;
    slots[0].innerHTML = '';
    slots[0].appendChild(buildErrorCard('Connection Status', err));
  });

  migrationsP.then(data => {
    if (signal.aborted) return;
    slots[1].innerHTML = '';
    slots[1].appendChild(buildMigrationsCard(data, false));
  }).catch(err => {
    if (signal.aborted) return;
    slots[1].innerHTML = '';
    slots[1].appendChild(buildErrorCard('Migrations', err));
  });

  functionsP.then(data => {
    if (signal.aborted) return;
    slots[2].innerHTML = '';
    slots[2].appendChild(buildFunctionsCard(data, false));
  }).catch(err => {
    if (signal.aborted) return;
    slots[2].innerHTML = '';
    slots[2].appendChild(buildErrorCard('Edge Functions', err));
  });

  extensionsP.then(data => {
    if (signal.aborted) return;
    slots[3].innerHTML = '';
    slots[3].appendChild(buildPgvectorCard(data, false));
  }).catch(err => {
    if (signal.aborted) return;
    slots[3].innerHTML = '';
    slots[3].appendChild(buildErrorCard('pgvector', err));
  });

  // After all resolve, check vault + db status for disabling
  Promise.all([healthP, migrationsP, functionsP, extensionsP]).catch(() => {
    // Individual handlers already dealt with errors
  });
}

function updateDisabledState(grid: HTMLElement, disabled: boolean): void {
  if (disabled) {
    const buttons = grid.querySelectorAll('button');
    buttons.forEach(btn => {
      if (!btn.classList.contains('btn--secondary') || btn.closest('.db-grid')) {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      }
    });
  }
}

function buildErrorCard(title: string, err: unknown): HTMLElement {
  const card = createCard();
  const header = createCardHeader(title);
  card.appendChild(header);

  const msg = document.createElement('p');
  msg.style.color = 'var(--color-text-muted)';
  msg.style.fontSize = 'var(--font-size-sm)';
  msg.style.margin = '0';
  msg.textContent = err instanceof Error ? err.message : 'Failed to load data';
  card.appendChild(msg);
  return card;
}

export function cleanup(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (container) {
    container.innerHTML = '';
    container = null;
  }
}

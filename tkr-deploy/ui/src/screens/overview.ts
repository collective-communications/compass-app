import { apiFetch, createEventSource } from '../api.js';
import { createCard } from '../components/card.js';
import { createStatusDot, type DotStatus } from '../components/status-dot.js';
import { createButton } from '../components/button.js';
import { createCopyButton } from '../components/copy-button.js';
import { navigate } from '../router.js';

// ── API response types ──

interface HealthResponse {
  deploymentUrl: string;
  lastDeployed: string | null;
  vaultLocked: boolean;
}

interface ProviderInfo {
  id: string;
  name: string;
  status: DotStatus;
  metrics: Record<string, string>;
  route: string;
}

interface ProvidersResponse {
  providers: ProviderInfo[];
}

interface ActivityEntry {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  status: string;
}

interface ActivityResponse {
  entries: ActivityEntry[];
}

interface SSEData {
  type: string;
  [key: string]: unknown;
}

// ── Module state ──

let container: HTMLElement | null = null;
let abortController: AbortController | null = null;
let eventSource: EventSource | null = null;
let vaultLocked = false;

// ── Skeleton helpers ──

function createSkeleton(width: string, height = '16px'): HTMLElement {
  const el = document.createElement('div');
  el.style.width = width;
  el.style.height = height;
  el.style.background = 'var(--color-border)';
  el.style.borderRadius = '4px';
  el.style.animation = 'pulse 1.5s ease-in-out infinite';
  el.setAttribute('aria-hidden', 'true');
  return el;
}

function injectPulseKeyframes(): void {
  if (document.getElementById('tkr-pulse-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'tkr-pulse-keyframes';
  style.textContent = `@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`;
  document.head.appendChild(style);
}

// ── Section builders ──

function buildDeploymentCard(health: HealthResponse | null): HTMLElement {
  const card = createCard();
  card.setAttribute('aria-label', 'Deployment URL');

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = 'var(--space-md)';
  row.style.flexWrap = 'wrap';

  if (!health) {
    row.appendChild(createSkeleton('260px', '20px'));
    card.appendChild(row);
    return card;
  }

  const urlEl = document.createElement('code');
  urlEl.style.fontSize = 'var(--font-size-base)';
  urlEl.style.fontWeight = '600';
  urlEl.style.wordBreak = 'break-all';
  urlEl.textContent = health.deploymentUrl;

  const copyBtn = createCopyButton(() => health.deploymentUrl);

  const timestamp = document.createElement('span');
  timestamp.style.fontSize = 'var(--font-size-sm)';
  timestamp.style.color = 'var(--color-text-secondary)';
  timestamp.style.marginLeft = 'auto';
  timestamp.textContent = health.lastDeployed
    ? `Last deployed ${formatRelativeTime(health.lastDeployed)}`
    : 'Never deployed';

  row.appendChild(urlEl);
  row.appendChild(copyBtn);
  row.appendChild(timestamp);
  card.appendChild(row);
  return card;
}

function buildProviderGrid(providers: ProviderInfo[] | null): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'overview-provider-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr';
  grid.style.gap = 'var(--space-md)';
  grid.setAttribute('aria-label', 'Provider health');

  if (!providers) {
    for (let i = 0; i < 4; i++) {
      const skel = createCard();
      skel.appendChild(createSkeleton('120px', '20px'));
      skel.style.marginTop = 'var(--space-sm)';
      skel.appendChild(createSkeleton('80px', '14px'));
      grid.appendChild(skel);
    }
    return grid;
  }

  for (const provider of providers) {
    const card = createCard();
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `${provider.name} — ${provider.status}`);

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = 'var(--space-sm)';

    const nameEl = document.createElement('span');
    nameEl.style.fontWeight = '600';
    nameEl.textContent = provider.name;

    const dot = createStatusDot(provider.status, provider.status);
    header.appendChild(nameEl);
    header.appendChild(dot);
    card.appendChild(header);

    const metricsEl = document.createElement('div');
    metricsEl.style.fontSize = 'var(--font-size-sm)';
    metricsEl.style.color = 'var(--color-text-secondary)';

    const entries = Object.entries(provider.metrics);
    if (entries.length === 0 || provider.status === 'unknown') {
      metricsEl.textContent = '\u2014';
    } else {
      metricsEl.textContent = entries.map(([k, v]) => `${k}: ${v}`).join(' \u00B7 ');
    }
    card.appendChild(metricsEl);

    const goToDetail = (): void => {
      void navigate(provider.route);
    };
    card.addEventListener('click', goToDetail);
    card.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToDetail();
      }
    });

    grid.appendChild(card);
  }

  return grid;
}

function buildQuickActions(locked: boolean): HTMLElement {
  const toolbar = document.createElement('div');
  toolbar.className = 'overview-quick-actions';
  toolbar.style.display = 'flex';
  toolbar.style.gap = 'var(--space-sm)';
  toolbar.style.flexWrap = 'wrap';
  toolbar.setAttribute('aria-label', 'Quick actions');

  const actionButtons: HTMLButtonElement[] = [];

  const actions: Array<{ label: string; variant: 'primary' | 'secondary'; path: string; lockDisabled: boolean }> = [
    { label: 'Full Deploy', variant: 'primary', path: '/api/deploy/full', lockDisabled: true },
    { label: 'Sync Secrets', variant: 'secondary', path: '/api/deploy/secrets', lockDisabled: true },
    { label: 'Push Migrations', variant: 'secondary', path: '/api/deploy/migrations', lockDisabled: false },
    { label: 'Deploy Functions', variant: 'secondary', path: '/api/deploy/functions', lockDisabled: false },
  ];

  for (const action of actions) {
    const isFullDeploy = action.variant === 'primary';

    const btn = createButton(action.label, {
      variant: action.variant,
      disabled: locked && action.lockDisabled,
      onClick: async () => {
        if (isFullDeploy) {
          for (const b of actionButtons) b.disabled = true;
        }
        try {
          await apiFetch(action.path, { method: 'POST' });
        } finally {
          if (isFullDeploy) {
            for (const b of actionButtons) {
              const idx = actionButtons.indexOf(b);
              const act = actions[idx];
              b.disabled = locked && act.lockDisabled;
            }
          }
        }
      },
    });

    actionButtons.push(btn);
    toolbar.appendChild(btn);
  }

  return toolbar;
}

function buildActivitySection(entries: ActivityEntry[] | null): HTMLElement {
  const section = document.createElement('section');
  section.setAttribute('aria-label', 'Recent activity');

  const heading = document.createElement('h2');
  heading.style.fontSize = 'var(--font-size-lg)';
  heading.style.fontWeight = '600';
  heading.style.margin = `0 0 var(--space-md)`;
  heading.textContent = 'Recent Activity';
  section.appendChild(heading);

  if (!entries) {
    const card = createCard();
    for (let i = 0; i < 3; i++) {
      const row = createSkeleton('100%', '18px');
      row.style.marginBottom = 'var(--space-sm)';
      card.appendChild(row);
    }
    section.appendChild(card);
    return section;
  }

  if (entries.length === 0) {
    const card = createCard();
    const empty = document.createElement('p');
    empty.style.color = 'var(--color-text-muted)';
    empty.textContent = 'No recent activity.';
    card.appendChild(empty);
    section.appendChild(card);
    return section;
  }

  // Desktop table
  const tableWrap = document.createElement('div');
  tableWrap.className = 'overview-activity-table';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.setAttribute('role', 'table');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of ['Action', 'Target', 'Status', 'Time']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.style.textAlign = 'left';
    th.style.padding = `var(--space-sm) var(--space-md)`;
    th.style.fontSize = 'var(--font-size-sm)';
    th.style.color = 'var(--color-text-secondary)';
    th.style.fontWeight = '500';
    th.style.borderBottom = '1px solid var(--color-border)';
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const entry of entries.slice(0, 5)) {
    const tr = document.createElement('tr');
    for (const val of [entry.action, entry.target, entry.status, formatRelativeTime(entry.timestamp)]) {
      const td = document.createElement('td');
      td.style.padding = `var(--space-sm) var(--space-md)`;
      td.style.fontSize = 'var(--font-size-sm)';
      td.style.borderBottom = '1px solid var(--color-border)';
      td.textContent = val;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);

  // Mobile stacked rows
  const mobileWrap = document.createElement('div');
  mobileWrap.className = 'overview-activity-mobile';

  for (const entry of entries.slice(0, 5)) {
    const card = createCard();
    card.style.marginBottom = 'var(--space-sm)';

    const topLine = document.createElement('div');
    topLine.style.display = 'flex';
    topLine.style.justifyContent = 'space-between';
    topLine.style.marginBottom = '4px';

    const actionEl = document.createElement('span');
    actionEl.style.fontWeight = '600';
    actionEl.style.fontSize = 'var(--font-size-sm)';
    actionEl.textContent = entry.action;

    const statusEl = document.createElement('span');
    statusEl.style.fontSize = 'var(--font-size-sm)';
    statusEl.style.color = 'var(--color-text-secondary)';
    statusEl.textContent = entry.status;

    topLine.appendChild(actionEl);
    topLine.appendChild(statusEl);
    card.appendChild(topLine);

    const bottomLine = document.createElement('div');
    bottomLine.style.display = 'flex';
    bottomLine.style.justifyContent = 'space-between';
    bottomLine.style.fontSize = 'var(--font-size-sm)';
    bottomLine.style.color = 'var(--color-text-muted)';

    const targetEl = document.createElement('span');
    targetEl.textContent = entry.target;
    const timeEl = document.createElement('span');
    timeEl.textContent = formatRelativeTime(entry.timestamp);

    bottomLine.appendChild(targetEl);
    bottomLine.appendChild(timeEl);
    card.appendChild(bottomLine);

    mobileWrap.appendChild(card);
  }

  section.appendChild(tableWrap);
  section.appendChild(mobileWrap);
  return section;
}

// ── Helpers ──

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function injectResponsiveStyles(): void {
  if (document.getElementById('tkr-overview-styles')) return;
  const style = document.createElement('style');
  style.id = 'tkr-overview-styles';
  style.textContent = `
    .overview-activity-mobile { display: block; }
    .overview-activity-table { display: none; }
    @media (min-width: 768px) {
      .overview-provider-grid { grid-template-columns: 1fr 1fr !important; }
      .overview-activity-mobile { display: none; }
      .overview-activity-table { display: block; }
    }
  `;
  document.head.appendChild(style);
}

// ── Render + Cleanup ──

export function render(target: HTMLElement): void {
  container = target;
  abortController = new AbortController();
  injectPulseKeyframes();
  injectResponsiveStyles();

  const heading = document.createElement('h1');
  heading.className = 'screen-heading';
  heading.textContent = 'Overview';
  container.appendChild(heading);

  // Sections with skeleton placeholders
  const layout = document.createElement('div');
  layout.style.display = 'flex';
  layout.style.flexDirection = 'column';
  layout.style.gap = 'var(--space-lg)';
  container.appendChild(layout);

  const deploySlot = document.createElement('div');
  const providerSlot = document.createElement('div');
  const actionsSlot = document.createElement('div');
  const activitySlot = document.createElement('div');

  layout.appendChild(deploySlot);
  layout.appendChild(providerSlot);
  layout.appendChild(actionsSlot);
  layout.appendChild(activitySlot);

  // Show skeletons immediately
  deploySlot.appendChild(buildDeploymentCard(null));
  providerSlot.appendChild(buildProviderGrid(null));
  activitySlot.appendChild(buildActivitySection(null));

  // Parallel data loading
  const signal = abortController.signal;

  const healthP = apiFetch<HealthResponse>('/api/health', { signal });
  const providersP = apiFetch<ProvidersResponse>('/api/providers', { signal });
  const activityP = apiFetch<ActivityResponse>('/api/activity', { signal });

  healthP.then((health) => {
    if (signal.aborted) return;
    vaultLocked = health.vaultLocked;
    deploySlot.innerHTML = '';
    deploySlot.appendChild(buildDeploymentCard(health));
    // Build actions once vault state is known
    actionsSlot.innerHTML = '';
    actionsSlot.appendChild(buildQuickActions(vaultLocked));
  }).catch(() => { /* aborted or network error — skeleton stays */ });

  providersP.then((data) => {
    if (signal.aborted) return;
    providerSlot.innerHTML = '';
    providerSlot.appendChild(buildProviderGrid(data.providers));
  }).catch(() => {});

  activityP.then((data) => {
    if (signal.aborted) return;
    activitySlot.innerHTML = '';
    activitySlot.appendChild(buildActivitySection(data.entries));
  }).catch(() => {});

  // SSE connection
  eventSource = createEventSource('/api/events', (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as SSEData;
      handleSSE(data, deploySlot, providerSlot, activitySlot, actionsSlot);
    } catch {
      // ignore malformed events
    }
  });
}

function handleSSE(
  data: SSEData,
  deploySlot: HTMLElement,
  providerSlot: HTMLElement,
  activitySlot: HTMLElement,
  actionsSlot: HTMLElement,
): void {
  switch (data.type) {
    case 'deploy:start':
    case 'deploy:complete':
      // Refresh health + activity
      void apiFetch<HealthResponse>('/api/health').then((health) => {
        vaultLocked = health.vaultLocked;
        deploySlot.innerHTML = '';
        deploySlot.appendChild(buildDeploymentCard(health));
        actionsSlot.innerHTML = '';
        actionsSlot.appendChild(buildQuickActions(vaultLocked));
      });
      void apiFetch<ActivityResponse>('/api/activity').then((a) => {
        activitySlot.innerHTML = '';
        activitySlot.appendChild(buildActivitySection(a.entries));
      });
      break;
    case 'health:update':
      void apiFetch<ProvidersResponse>('/api/providers').then((p) => {
        providerSlot.innerHTML = '';
        providerSlot.appendChild(buildProviderGrid(p.providers));
      });
      break;
  }
}

export function cleanup(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (container) {
    container.innerHTML = '';
    container = null;
  }
  vaultLocked = false;
}

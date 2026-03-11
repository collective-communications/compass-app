import { apiFetch } from '../api.js';
import { createCard } from '../components/card.js';
import { createStatusDot, type DotStatus } from '../components/status-dot.js';
import { createButton } from '../components/button.js';

// ── API response types ──

interface VaultStatus {
  name: string;
  locked: boolean;
  secretCount: number;
}

type SyncState = 'synced' | 'missing' | 'differs' | 'not_applicable';

interface SecretTarget {
  name: string;
  state: SyncState;
}

interface SecretEntry {
  name: string;
  maskedValue: string;
  targets: SecretTarget[];
  outOfSync: boolean;
}

interface SecretsResponse {
  vault: VaultStatus;
  secrets: SecretEntry[];
}

interface HealthResponse {
  vaultLocked: boolean;
}

// ── Module state ──

let container: HTMLElement | null = null;
let abortController: AbortController | null = null;
let activeFilter = 'all';

// ── Helpers ──

function syncStateIcon(state: SyncState): string {
  switch (state) {
    case 'synced': return '\u2713';
    case 'missing': return '\u2717';
    case 'differs': return '~';
    case 'not_applicable': return '\u2014';
  }
}

function syncStateDotStatus(state: SyncState): DotStatus {
  switch (state) {
    case 'synced': return 'healthy';
    case 'missing': return 'warning';
    case 'differs': return 'warning';
    case 'not_applicable': return 'unknown';
  }
}

const TARGET_NAMES = ['Supabase', 'Vercel', 'GitHub'] as const;
type TargetName = typeof TARGET_NAMES[number];

function getTargetState(entry: SecretEntry, targetName: string): SyncState {
  const t = entry.targets.find((t) => t.name === targetName);
  return t?.state ?? 'not_applicable';
}

function matchesFilter(entry: SecretEntry, filter: string): boolean {
  if (filter === 'all') return true;
  return entry.targets.some(
    (t) => t.name.toLowerCase() === filter.toLowerCase() && t.state !== 'not_applicable',
  );
}

function injectSecretsStyles(): void {
  if (document.getElementById('tkr-secrets-styles')) return;
  const style = document.createElement('style');
  style.id = 'tkr-secrets-styles';
  style.textContent = `
    .secrets-table-wrap { display: none; }
    .secrets-mobile-wrap { display: block; }
    .secrets-diff-sheet {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: var(--color-surface);
      border-top: 1px solid var(--color-border);
      padding: var(--space-lg);
      z-index: 200;
      max-height: 50vh;
      overflow-y: auto;
    }
    .secrets-diff-sheet__scrim {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.3);
      z-index: 199;
    }
    @media (min-width: 768px) {
      .secrets-table-wrap { display: block; }
      .secrets-mobile-wrap { display: none; }
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  `;
  document.head.appendChild(style);
}

// ── Section builders ──

function buildVaultBanner(vault: VaultStatus | null): HTMLElement {
  const card = createCard();
  card.setAttribute('aria-label', 'Vault status');

  if (!vault) {
    const skel = document.createElement('div');
    skel.style.width = '200px';
    skel.style.height = '20px';
    skel.style.background = 'var(--color-border)';
    skel.style.borderRadius = '4px';
    skel.style.animation = 'pulse 1.5s ease-in-out infinite';
    card.appendChild(skel);
    return card;
  }

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = 'var(--space-md)';
  row.style.flexWrap = 'wrap';

  const nameEl = document.createElement('span');
  nameEl.style.fontWeight = '600';
  nameEl.textContent = vault.name;

  const badge = document.createElement('span');
  badge.style.fontSize = 'var(--font-size-sm)';
  badge.style.padding = '2px 8px';
  badge.style.borderRadius = 'var(--radius-pill)';
  badge.style.fontWeight = '500';
  if (vault.locked) {
    badge.style.background = 'var(--color-border)';
    badge.style.color = 'var(--color-text-secondary)';
    badge.textContent = 'Locked';
  } else {
    badge.style.background = 'var(--color-active)';
    badge.style.color = 'var(--color-active-text)';
    badge.textContent = 'Unlocked';
  }

  const countEl = document.createElement('span');
  countEl.style.fontSize = 'var(--font-size-sm)';
  countEl.style.color = 'var(--color-text-secondary)';
  countEl.textContent = `${vault.secretCount} secret${vault.secretCount === 1 ? '' : 's'}`;

  const openLink = document.createElement('a');
  openLink.href = 'http://localhost:42042';
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  openLink.style.fontSize = 'var(--font-size-sm)';
  openLink.style.marginLeft = 'auto';
  openLink.textContent = 'Open Vault';

  row.appendChild(nameEl);
  row.appendChild(badge);
  row.appendChild(countEl);
  row.appendChild(openLink);
  card.appendChild(row);
  return card;
}

function buildSyncSummary(secrets: SecretEntry[] | null, onSyncAll: () => Promise<void>): HTMLElement {
  const card = createCard();
  card.setAttribute('aria-label', 'Sync summary');

  if (!secrets) {
    const skel = document.createElement('div');
    skel.style.width = '300px';
    skel.style.height = '18px';
    skel.style.background = 'var(--color-border)';
    skel.style.borderRadius = '4px';
    skel.style.animation = 'pulse 1.5s ease-in-out infinite';
    card.appendChild(skel);
    return card;
  }

  const total = secrets.length;
  const outOfSync = secrets.filter((s) => s.outOfSync).length;
  const missing = secrets.filter((s) => s.targets.some((t) => t.state === 'missing')).length;
  const synced = total - outOfSync;

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = 'var(--space-lg)';
  row.style.flexWrap = 'wrap';

  const metrics: Array<[string, number]> = [
    ['Total', total],
    ['Out of Sync', outOfSync],
    ['Missing', missing],
    ['Synced', synced],
  ];

  for (const [label, value] of metrics) {
    const metric = document.createElement('span');
    metric.style.fontSize = 'var(--font-size-sm)';
    const valSpan = document.createElement('strong');
    valSpan.textContent = String(value);
    metric.appendChild(valSpan);
    metric.appendChild(document.createTextNode(` ${label}`));
    row.appendChild(metric);
  }

  const allSynced = outOfSync === 0;
  const syncBtn = createButton('Sync All', {
    variant: 'primary',
    disabled: allSynced,
    onClick: onSyncAll,
  });
  syncBtn.style.marginLeft = 'auto';
  row.appendChild(syncBtn);

  card.appendChild(row);
  return card;
}

function buildFilterPills(onChange: (filter: string) => void): HTMLElement {
  const bar = document.createElement('div');
  bar.style.display = 'flex';
  bar.style.gap = 'var(--space-sm)';
  bar.style.flexWrap = 'wrap';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Filter by target');

  const filters = ['All', 'Supabase', 'Vercel', 'GitHub'];
  const buttons: HTMLButtonElement[] = [];

  for (const name of filters) {
    const btn = document.createElement('button');
    btn.className = 'shell-pill';
    btn.textContent = name;
    const filterValue = name.toLowerCase();
    const isActive = filterValue === activeFilter;
    btn.setAttribute('aria-pressed', String(isActive));
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    }

    btn.addEventListener('click', () => {
      activeFilter = filterValue;
      for (const b of buttons) {
        const bVal = (b.textContent ?? '').toLowerCase();
        const bActive = bVal === activeFilter;
        b.setAttribute('aria-pressed', String(bActive));
        if (bActive) {
          b.setAttribute('aria-current', 'page');
        } else {
          b.removeAttribute('aria-current');
        }
      }
      onChange(activeFilter);
    });

    buttons.push(btn);
    bar.appendChild(btn);
  }

  return bar;
}

function buildSecretsTable(secrets: SecretEntry[], onSync: (name: string) => Promise<void>): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'secrets-table-wrap';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.setAttribute('role', 'table');
  table.setAttribute('aria-label', 'Secrets');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const columns = ['Secret Name', 'Vault Value', ...TARGET_NAMES, 'Action'];
  for (const col of columns) {
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

  for (const entry of secrets) {
    if (!matchesFilter(entry, activeFilter)) continue;

    const tr = document.createElement('tr');

    if (entry.outOfSync) {
      tr.style.borderLeft = '4px solid var(--color-text-secondary)';
    }

    // Secret name
    const nameTd = document.createElement('td');
    nameTd.style.padding = `var(--space-sm) var(--space-md)`;
    nameTd.style.borderBottom = '1px solid var(--color-border)';
    const code = document.createElement('code');
    code.style.fontSize = 'var(--font-size-sm)';
    code.textContent = entry.name;
    nameTd.appendChild(code);
    tr.appendChild(nameTd);

    // Masked value
    const valTd = document.createElement('td');
    valTd.style.padding = `var(--space-sm) var(--space-md)`;
    valTd.style.borderBottom = '1px solid var(--color-border)';
    valTd.style.fontSize = 'var(--font-size-sm)';
    valTd.style.fontFamily = 'monospace';
    valTd.textContent = entry.maskedValue;
    tr.appendChild(valTd);

    // Target status columns
    for (const target of TARGET_NAMES) {
      const td = document.createElement('td');
      td.style.padding = `var(--space-sm) var(--space-md)`;
      td.style.borderBottom = '1px solid var(--color-border)';
      td.style.fontSize = 'var(--font-size-sm)';
      const state = getTargetState(entry, target);
      td.textContent = syncStateIcon(state);
      td.setAttribute('aria-label', `${target}: ${state}`);
      tr.appendChild(td);
    }

    // Action column
    const actionTd = document.createElement('td');
    actionTd.style.padding = `var(--space-sm) var(--space-md)`;
    actionTd.style.borderBottom = '1px solid var(--color-border)';

    if (entry.outOfSync) {
      const syncBtn = createButton('Sync', {
        variant: 'secondary',
        onClick: () => onSync(entry.name),
      });
      actionTd.appendChild(syncBtn);

      // Diff button for differs state
      const hasDiff = entry.targets.some((t) => t.state === 'differs');
      if (hasDiff) {
        const diffBtn = createButton('Diff', {
          variant: 'secondary',
          onClick: async () => {
            toggleDiffRow(tr, entry);
          },
        });
        diffBtn.style.marginLeft = 'var(--space-sm)';
        actionTd.appendChild(diffBtn);
      }
    } else {
      const badge = document.createElement('span');
      badge.style.fontSize = 'var(--font-size-sm)';
      badge.style.color = 'var(--color-text-secondary)';
      badge.textContent = 'Synced';
      actionTd.appendChild(badge);
    }

    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

function toggleDiffRow(tr: HTMLTableRowElement, entry: SecretEntry): void {
  const existing = tr.nextElementSibling;
  if (existing?.classList.contains('secrets-diff-row')) {
    existing.remove();
    return;
  }

  const diffTr = document.createElement('tr');
  diffTr.className = 'secrets-diff-row';
  const diffTd = document.createElement('td');
  diffTd.colSpan = 7;
  diffTd.style.padding = 'var(--space-md)';
  diffTd.style.background = 'var(--color-bg)';
  diffTd.style.fontSize = 'var(--font-size-sm)';
  diffTd.style.fontFamily = 'monospace';
  diffTd.style.borderBottom = '1px solid var(--color-border)';

  const differing = entry.targets.filter((t) => t.state === 'differs');
  diffTd.textContent = differing
    .map((t) => `${t.name}: value differs from vault`)
    .join('\n');
  diffTd.style.whiteSpace = 'pre-wrap';

  diffTr.appendChild(diffTd);
  tr.after(diffTr);
}

function buildSecretsMobile(secrets: SecretEntry[], onSync: (name: string) => Promise<void>): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'secrets-mobile-wrap';

  for (const entry of secrets) {
    if (!matchesFilter(entry, activeFilter)) continue;

    const card = createCard(entry.outOfSync ? { borderColor: 'var(--color-text-secondary)' } : undefined);
    card.style.marginBottom = 'var(--space-sm)';

    // Name
    const nameEl = document.createElement('code');
    nameEl.style.fontWeight = '600';
    nameEl.style.fontSize = 'var(--font-size-sm)';
    nameEl.textContent = entry.name;
    card.appendChild(nameEl);

    // Masked value
    const valEl = document.createElement('div');
    valEl.style.fontSize = 'var(--font-size-sm)';
    valEl.style.fontFamily = 'monospace';
    valEl.style.color = 'var(--color-text-secondary)';
    valEl.style.margin = `4px 0 var(--space-sm)`;
    valEl.textContent = entry.maskedValue;
    card.appendChild(valEl);

    // Target status row
    const statusRow = document.createElement('div');
    statusRow.style.display = 'flex';
    statusRow.style.gap = 'var(--space-md)';
    statusRow.style.marginBottom = 'var(--space-sm)';

    for (const target of TARGET_NAMES) {
      const state = getTargetState(entry, target);
      const dot = createStatusDot(syncStateDotStatus(state), `${target} ${syncStateIcon(state)}`);
      statusRow.appendChild(dot);
    }
    card.appendChild(statusRow);

    // Actions
    if (entry.outOfSync) {
      const actionsRow = document.createElement('div');
      actionsRow.style.display = 'flex';
      actionsRow.style.gap = 'var(--space-sm)';

      actionsRow.appendChild(createButton('Sync', {
        variant: 'secondary',
        onClick: () => onSync(entry.name),
      }));

      const hasDiff = entry.targets.some((t) => t.state === 'differs');
      if (hasDiff) {
        actionsRow.appendChild(createButton('Diff', {
          variant: 'secondary',
          onClick: async () => {
            showMobileDiffSheet(entry);
          },
        }));
      }

      card.appendChild(actionsRow);
    }

    wrap.appendChild(card);
  }

  if (wrap.children.length === 0) {
    const empty = createCard();
    const p = document.createElement('p');
    p.style.color = 'var(--color-text-muted)';
    p.textContent = 'No secrets match this filter.';
    empty.appendChild(p);
    wrap.appendChild(empty);
  }

  return wrap;
}

function showMobileDiffSheet(entry: SecretEntry): void {
  // Remove existing
  closeMobileDiffSheet();

  const scrim = document.createElement('div');
  scrim.className = 'secrets-diff-sheet__scrim';
  scrim.addEventListener('click', closeMobileDiffSheet);

  const sheet = document.createElement('div');
  sheet.className = 'secrets-diff-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', `Diff for ${entry.name}`);

  const heading = document.createElement('h3');
  heading.style.margin = `0 0 var(--space-md)`;
  heading.style.fontSize = 'var(--font-size-base)';
  heading.textContent = entry.name;
  sheet.appendChild(heading);

  const differing = entry.targets.filter((t) => t.state === 'differs');
  for (const t of differing) {
    const line = document.createElement('div');
    line.style.fontSize = 'var(--font-size-sm)';
    line.style.fontFamily = 'monospace';
    line.style.marginBottom = '4px';
    line.textContent = `${t.name}: value differs from vault`;
    sheet.appendChild(line);
  }

  const closeBtn = createButton('Close', {
    variant: 'secondary',
    onClick: async () => { closeMobileDiffSheet(); },
  });
  closeBtn.style.marginTop = 'var(--space-md)';
  sheet.appendChild(closeBtn);

  document.body.appendChild(scrim);
  document.body.appendChild(sheet);
}

function closeMobileDiffSheet(): void {
  document.querySelectorAll('.secrets-diff-sheet__scrim, .secrets-diff-sheet').forEach((el) => el.remove());
}

function buildLockedEmptyState(): HTMLElement {
  const card = createCard();
  card.style.textAlign = 'center';
  card.style.padding = 'var(--space-xl)';

  const icon = document.createElement('div');
  icon.style.fontSize = '48px';
  icon.style.marginBottom = 'var(--space-md)';
  icon.textContent = '\uD83D\uDD12';
  icon.setAttribute('aria-hidden', 'true');
  card.appendChild(icon);

  const msg = document.createElement('p');
  msg.style.color = 'var(--color-text-secondary)';
  msg.textContent = 'Vault is locked. Unlock to view and manage secrets.';
  card.appendChild(msg);

  const link = document.createElement('a');
  link.href = 'http://localhost:42042';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open Vault';
  link.style.display = 'inline-block';
  link.style.marginTop = 'var(--space-md)';
  card.appendChild(link);

  return card;
}

// ── Render helpers ──

function renderSecretsList(
  listSlot: HTMLElement,
  secrets: SecretEntry[],
  onSync: (name: string) => Promise<void>,
): void {
  listSlot.innerHTML = '';
  listSlot.appendChild(buildSecretsTable(secrets, onSync));
  listSlot.appendChild(buildSecretsMobile(secrets, onSync));
}

// ── Render + Cleanup ──

export function render(target: HTMLElement): void {
  container = target;
  abortController = new AbortController();
  activeFilter = 'all';
  injectSecretsStyles();

  const heading = document.createElement('h1');
  heading.className = 'screen-heading';
  heading.textContent = 'Secrets';
  container.appendChild(heading);

  const layout = document.createElement('div');
  layout.style.display = 'flex';
  layout.style.flexDirection = 'column';
  layout.style.gap = 'var(--space-lg)';
  container.appendChild(layout);

  const vaultSlot = document.createElement('div');
  const summarySlot = document.createElement('div');
  const filterSlot = document.createElement('div');
  const listSlot = document.createElement('div');

  layout.appendChild(vaultSlot);
  layout.appendChild(summarySlot);
  layout.appendChild(filterSlot);
  layout.appendChild(listSlot);

  // Skeleton
  vaultSlot.appendChild(buildVaultBanner(null));
  summarySlot.appendChild(buildSyncSummary(null, async () => {}));

  const signal = abortController.signal;

  apiFetch<SecretsResponse>('/api/secrets', { signal })
    .then((data) => {
      if (signal.aborted) return;

      // Vault locked → empty state
      if (data.vault.locked) {
        vaultSlot.innerHTML = '';
        vaultSlot.appendChild(buildVaultBanner(data.vault));
        summarySlot.innerHTML = '';
        listSlot.innerHTML = '';
        listSlot.appendChild(buildLockedEmptyState());
        return;
      }

      const secrets = data.secrets;

      const syncSecret = async (name: string): Promise<void> => {
        await apiFetch(`/api/secrets/${encodeURIComponent(name)}/sync`, { method: 'POST' });
        // Reload
        const refreshed = await apiFetch<SecretsResponse>('/api/secrets');
        renderSecretsList(listSlot, refreshed.secrets, syncSecret);
        summarySlot.innerHTML = '';
        summarySlot.appendChild(buildSyncSummary(refreshed.secrets, syncAll));
      };

      const syncAll = async (): Promise<void> => {
        await apiFetch('/api/secrets/sync', { method: 'POST' });
        const refreshed = await apiFetch<SecretsResponse>('/api/secrets');
        renderSecretsList(listSlot, refreshed.secrets, syncSecret);
        summarySlot.innerHTML = '';
        summarySlot.appendChild(buildSyncSummary(refreshed.secrets, syncAll));
      };

      vaultSlot.innerHTML = '';
      vaultSlot.appendChild(buildVaultBanner(data.vault));
      summarySlot.innerHTML = '';
      summarySlot.appendChild(buildSyncSummary(secrets, syncAll));

      filterSlot.innerHTML = '';
      filterSlot.appendChild(buildFilterPills((filter) => {
        activeFilter = filter;
        renderSecretsList(listSlot, secrets, syncSecret);
      }));

      renderSecretsList(listSlot, secrets, syncSecret);
    })
    .catch(() => { /* aborted or network error */ });
}

export function cleanup(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  closeMobileDiffSheet();
  if (container) {
    container.innerHTML = '';
    container = null;
  }
  activeFilter = 'all';
}

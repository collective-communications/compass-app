import { createCard } from '../components/card.js';
import { createButton } from '../components/button.js';
import { apiFetch } from '../api.js';

// ── Types ──

interface ProjectData {
  name: string;
  framework: string;
  productionUrl: string;
}

interface DeploymentData {
  id: string;
  status: 'Ready' | 'Building' | 'Error' | 'Queued';
  commitHash: string;
  commitMessage: string;
  branch: string;
  duration: string;
  deployedAt: string;
  previewUrl?: string;
}

interface DeploymentsResponse {
  current: DeploymentData;
  history: DeploymentData[];
}

interface EnvVar {
  key: string;
  value: string;
  vaultMatch: 'match' | 'mismatch' | 'missing' | 'unknown';
  target: 'production' | 'preview' | 'development';
}

interface EnvResponse {
  variables: EnvVar[];
  vaultOnline: boolean;
}

interface HealthData {
  status: 'connected' | 'disconnected';
}

// ── State ──

let container: HTMLElement | null = null;
let abortController: AbortController | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ──

function createSkeleton(height = '120px'): HTMLElement {
  const el = document.createElement('div');
  el.style.height = height;
  el.style.borderRadius = 'var(--radius-card)';
  el.style.background = 'var(--color-border)';
  el.style.animation = 'pulse 1.5s ease-in-out infinite';
  return el;
}

function createBadge(text: string, variant: 'default' | 'accent' | 'warning' | 'error' = 'default'): HTMLElement {
  const badge = document.createElement('span');
  badge.textContent = text;
  badge.style.display = 'inline-block';
  badge.style.padding = '2px 8px';
  badge.style.borderRadius = 'var(--radius-pill)';
  badge.style.fontSize = 'var(--font-size-sm)';
  badge.style.fontWeight = '500';

  switch (variant) {
    case 'accent':
      badge.style.background = 'var(--color-active)';
      badge.style.color = 'var(--color-active-text)';
      break;
    case 'warning':
      badge.style.background = '#FFF3E0';
      badge.style.color = '#E65100';
      break;
    case 'error':
      badge.style.background = '#FFEBEE';
      badge.style.color = '#C62828';
      break;
    default:
      badge.style.background = 'var(--color-border)';
      badge.style.color = 'var(--color-text-secondary)';
  }
  return badge;
}

function createCardHeader(title: string, action?: HTMLButtonElement): HTMLElement {
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.marginBottom = 'var(--space-md)';
  header.style.flexWrap = 'wrap';
  header.style.gap = 'var(--space-sm)';

  const h2 = document.createElement('h2');
  h2.textContent = title;
  h2.style.margin = '0';
  h2.style.fontSize = 'var(--font-size-lg)';
  h2.style.fontWeight = '600';
  header.appendChild(h2);

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

function statusBadgeVariant(status: DeploymentData['status']): 'accent' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'Ready': return 'accent';
    case 'Building': return 'warning';
    case 'Error': return 'error';
    default: return 'default';
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

// ── Card Builders ──

function buildProjectStatusCard(project: ProjectData, isBuilding: boolean): HTMLElement {
  const card = createCard();

  const redeployBtn = createButton('Redeploy', {
    variant: 'primary',
    disabled: isBuilding,
    onClick: async () => {
      await apiFetch('/api/frontend/redeploy', { method: 'POST' });
    },
  });
  if (isBuilding) {
    redeployBtn.setAttribute('aria-disabled', 'true');
  }

  const header = createCardHeader('Project Status', redeployBtn);
  card.appendChild(header);

  const frameworkBadge = createBadge(project.framework);

  const urlLink = document.createElement('a');
  urlLink.href = project.productionUrl;
  urlLink.textContent = project.productionUrl;
  urlLink.target = '_blank';
  urlLink.rel = 'noopener noreferrer';
  urlLink.style.color = 'var(--color-active)';
  urlLink.style.textDecoration = 'none';
  urlLink.style.fontSize = 'var(--font-size-sm)';

  const dl = createDl([
    { label: 'Name', value: project.name },
    { label: 'Framework', value: frameworkBadge },
    { label: 'Production URL', value: urlLink },
  ]);
  card.appendChild(dl);
  return card;
}

function buildCurrentDeploymentCard(deployment: DeploymentData): HTMLElement {
  const card = createCard();
  const header = createCardHeader('Current Deployment');
  card.appendChild(header);

  const statusBadge = createBadge(deployment.status, statusBadgeVariant(deployment.status));

  const commitEl = document.createElement('span');
  commitEl.style.display = 'flex';
  commitEl.style.alignItems = 'center';
  commitEl.style.gap = 'var(--space-sm)';
  commitEl.style.fontSize = 'var(--font-size-sm)';

  const hash = document.createElement('code');
  hash.textContent = deployment.commitHash.slice(0, 7);
  hash.style.background = 'var(--color-border)';
  hash.style.padding = '1px 4px';
  hash.style.borderRadius = '3px';
  hash.style.fontSize = 'var(--font-size-sm)';
  commitEl.appendChild(hash);

  const msg = document.createElement('span');
  msg.textContent = deployment.commitMessage;
  msg.style.color = 'var(--color-text-secondary)';
  commitEl.appendChild(msg);

  const dl = createDl([
    { label: 'Status', value: statusBadge },
    { label: 'Commit', value: commitEl },
    { label: 'Branch', value: deployment.branch },
    { label: 'Duration', value: deployment.duration },
    { label: 'Deployed', value: deployment.deployedAt },
  ]);
  card.appendChild(dl);
  return card;
}

function buildEnvVarsCard(envData: EnvResponse): HTMLElement {
  const card = createCard();

  const syncBtn = createButton('Sync from Vault', {
    variant: 'primary',
    disabled: !envData.vaultOnline,
    onClick: async () => {
      await apiFetch('/api/frontend/env/sync', { method: 'POST' });
    },
  });
  if (!envData.vaultOnline) {
    syncBtn.setAttribute('aria-disabled', 'true');
  }

  const header = createCardHeader('Environment Variables', syncBtn);
  card.appendChild(header);

  const tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = 'var(--font-size-sm)';
  table.setAttribute('aria-label', 'Environment variables');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const colName of ['Variable', 'Value', 'Vault Match', 'Target']) {
    const th = document.createElement('th');
    th.textContent = colName;
    th.style.textAlign = 'left';
    th.style.padding = 'var(--space-sm)';
    th.style.borderBottom = '1px solid var(--color-border)';
    th.style.color = 'var(--color-text-muted)';
    th.style.fontWeight = '500';
    th.setAttribute('scope', 'col');
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const v of envData.variables) {
    const tr = document.createElement('tr');

    // Variable
    const tdVar = document.createElement('td');
    tdVar.style.padding = 'var(--space-sm)';
    tdVar.style.borderBottom = '1px solid var(--color-border)';
    const code = document.createElement('code');
    code.textContent = v.key;
    code.style.fontSize = 'var(--font-size-sm)';
    tdVar.appendChild(code);
    tr.appendChild(tdVar);

    // Value (masked)
    const tdVal = document.createElement('td');
    tdVal.style.padding = 'var(--space-sm)';
    tdVal.style.borderBottom = '1px solid var(--color-border)';
    tdVal.style.color = 'var(--color-text-muted)';
    tdVal.textContent = v.value;
    tr.appendChild(tdVal);

    // Vault Match
    const tdMatch = document.createElement('td');
    tdMatch.style.padding = 'var(--space-sm)';
    tdMatch.style.borderBottom = '1px solid var(--color-border)';
    if (!envData.vaultOnline) {
      tdMatch.textContent = '\u2014';
      tdMatch.style.color = 'var(--color-text-muted)';
    } else {
      const matchIcon = v.vaultMatch === 'match' ? '\u2713'
        : v.vaultMatch === 'mismatch' ? '\u2717'
        : v.vaultMatch === 'missing' ? '\u2014'
        : '?';
      const matchText = v.vaultMatch === 'match' ? 'Match'
        : v.vaultMatch === 'mismatch' ? 'Mismatch'
        : v.vaultMatch === 'missing' ? 'Missing'
        : 'Unknown';
      tdMatch.textContent = `${matchIcon} ${matchText}`;
      if (v.vaultMatch === 'mismatch') {
        tdMatch.style.color = '#E65100';
      } else if (v.vaultMatch === 'missing') {
        tdMatch.style.color = 'var(--color-text-muted)';
      }
    }
    tr.appendChild(tdMatch);

    // Target
    const tdTarget = document.createElement('td');
    tdTarget.style.padding = 'var(--space-sm)';
    tdTarget.style.borderBottom = '1px solid var(--color-border)';
    tdTarget.appendChild(createBadge(v.target));
    tr.appendChild(tdTarget);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);
  return card;
}

function buildDeployHistoryCard(
  history: DeploymentData[],
  signal: AbortSignal,
  onRefresh: () => void,
): HTMLElement {
  const card = createCard();
  const header = createCardHeader('Deployment History');
  card.appendChild(header);

  const tableWrap = document.createElement('div');
  tableWrap.style.overflowX = 'auto';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = 'var(--font-size-sm)';
  table.setAttribute('aria-label', 'Deployment history');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const colName of ['Status', 'Commit', 'Branch', 'Duration', 'Deployed', '']) {
    const th = document.createElement('th');
    th.textContent = colName;
    th.style.textAlign = 'left';
    th.style.padding = 'var(--space-sm)';
    th.style.borderBottom = '1px solid var(--color-border)';
    th.style.color = 'var(--color-text-muted)';
    th.style.fontWeight = '500';
    th.setAttribute('scope', 'col');
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (const dep of history.slice(0, 5)) {
    const tr = document.createElement('tr');
    tr.dataset.deployId = dep.id;

    // Status
    const tdStatus = document.createElement('td');
    tdStatus.style.padding = 'var(--space-sm)';
    tdStatus.style.borderBottom = '1px solid var(--color-border)';
    tdStatus.appendChild(createBadge(dep.status, statusBadgeVariant(dep.status)));
    tr.appendChild(tdStatus);

    // Commit
    const tdCommit = document.createElement('td');
    tdCommit.style.padding = 'var(--space-sm)';
    tdCommit.style.borderBottom = '1px solid var(--color-border)';
    const commitCode = document.createElement('code');
    commitCode.textContent = dep.commitHash.slice(0, 7);
    commitCode.style.fontSize = 'var(--font-size-sm)';
    tdCommit.appendChild(commitCode);
    tr.appendChild(tdCommit);

    // Branch
    const tdBranch = document.createElement('td');
    tdBranch.style.padding = 'var(--space-sm)';
    tdBranch.style.borderBottom = '1px solid var(--color-border)';
    tdBranch.textContent = dep.branch;
    tr.appendChild(tdBranch);

    // Duration
    const tdDuration = document.createElement('td');
    tdDuration.style.padding = 'var(--space-sm)';
    tdDuration.style.borderBottom = '1px solid var(--color-border)';
    tdDuration.textContent = dep.duration;
    tr.appendChild(tdDuration);

    // Deployed
    const tdDeployed = document.createElement('td');
    tdDeployed.style.padding = 'var(--space-sm)';
    tdDeployed.style.borderBottom = '1px solid var(--color-border)';
    tdDeployed.textContent = dep.deployedAt;
    tr.appendChild(tdDeployed);

    // Action (Promote for preview deployments)
    const tdAction = document.createElement('td');
    tdAction.style.padding = 'var(--space-sm)';
    tdAction.style.borderBottom = '1px solid var(--color-border)';

    if (dep.previewUrl) {
      const promoteBtn = createButton('Promote', {
        variant: 'secondary',
        onClick: async () => {
          // Replace button with inline confirm/cancel
          promoteBtn.style.display = 'none';
          const confirmRow = document.createElement('span');
          confirmRow.style.display = 'inline-flex';
          confirmRow.style.gap = 'var(--space-sm)';

          const confirmBtn = createButton('Confirm', {
            variant: 'primary',
            onClick: async () => {
              await apiFetch(`/api/frontend/deployments/${encodeURIComponent(dep.id)}/promote`, { method: 'POST' });
              if (!signal.aborted) onRefresh();
            },
          });

          const cancelBtn = createButton('Cancel', {
            variant: 'secondary',
            onClick: async () => {
              confirmRow.remove();
              promoteBtn.style.display = '';
            },
          });

          confirmRow.appendChild(confirmBtn);
          confirmRow.appendChild(cancelBtn);
          tdAction.appendChild(confirmRow);
        },
      });
      tdAction.appendChild(promoteBtn);
    }

    tr.appendChild(tdAction);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);
  return card;
}

// ── Main ──

export function render(target: HTMLElement): void {
  container = target;
  abortController = new AbortController();
  const signal = abortController.signal;

  const heading = document.createElement('h1');
  heading.className = 'screen-heading';
  heading.textContent = 'Frontend';
  container.appendChild(heading);

  // Layout: top row (2-col on desktop), then full-width cards
  const topGrid = document.createElement('div');
  topGrid.className = 'fe-top-grid';
  topGrid.style.display = 'grid';
  topGrid.style.gridTemplateColumns = '1fr';
  topGrid.style.gap = 'var(--space-md)';

  const fullStack = document.createElement('div');
  fullStack.style.display = 'flex';
  fullStack.style.flexDirection = 'column';
  fullStack.style.gap = 'var(--space-md)';
  fullStack.style.marginTop = 'var(--space-md)';

  container.appendChild(topGrid);
  container.appendChild(fullStack);

  const style = document.createElement('style');
  style.textContent = `
    @media (min-width: 768px) {
      .fe-top-grid { grid-template-columns: 1fr 1fr !important; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  container.appendChild(style);

  // Skeleton slots
  const projectSlot = document.createElement('div');
  projectSlot.appendChild(createSkeleton());
  topGrid.appendChild(projectSlot);

  const deploySlot = document.createElement('div');
  deploySlot.appendChild(createSkeleton());
  topGrid.appendChild(deploySlot);

  const envSlot = document.createElement('div');
  envSlot.appendChild(createSkeleton('160px'));
  fullStack.appendChild(envSlot);

  const historySlot = document.createElement('div');
  historySlot.appendChild(createSkeleton('200px'));
  fullStack.appendChild(historySlot);

  // Fetches
  const projectP = apiFetch<ProjectData>('/api/frontend/project', { signal });
  const deploymentsP = apiFetch<DeploymentsResponse>('/api/frontend/deployments', { signal });
  const envP = apiFetch<EnvResponse>('/api/frontend/env', { signal });

  let currentIsBuilding = false;

  function loadData(): void {
    projectP.then(project => {
      if (signal.aborted) return;
      projectSlot.innerHTML = '';
      projectSlot.appendChild(buildProjectStatusCard(project, currentIsBuilding));
    }).catch(err => {
      if (signal.aborted) return;
      projectSlot.innerHTML = '';
      projectSlot.appendChild(buildErrorCard('Project Status', err));
    });

    deploymentsP.then(data => {
      if (signal.aborted) return;
      currentIsBuilding = data.current.status === 'Building';

      deploySlot.innerHTML = '';
      deploySlot.appendChild(buildCurrentDeploymentCard(data.current));

      historySlot.innerHTML = '';
      historySlot.appendChild(buildDeployHistoryCard(data.history, signal, refreshDeployments));

      // Update project card's redeploy button state
      projectP.then(project => {
        if (signal.aborted) return;
        projectSlot.innerHTML = '';
        projectSlot.appendChild(buildProjectStatusCard(project, currentIsBuilding));
      }).catch(() => { /* already handled */ });

      // Poll when building
      startPollingIfBuilding(data.current.status, signal);
    }).catch(err => {
      if (signal.aborted) return;
      deploySlot.innerHTML = '';
      deploySlot.appendChild(buildErrorCard('Current Deployment', err));
      historySlot.innerHTML = '';
      historySlot.appendChild(buildErrorCard('Deployment History', err));
    });

    envP.then(envData => {
      if (signal.aborted) return;
      envSlot.innerHTML = '';
      envSlot.appendChild(buildEnvVarsCard(envData));
    }).catch(err => {
      if (signal.aborted) return;
      envSlot.innerHTML = '';
      envSlot.appendChild(buildErrorCard('Environment Variables', err));
    });
  }

  function refreshDeployments(): void {
    if (signal.aborted) return;
    apiFetch<DeploymentsResponse>('/api/frontend/deployments', { signal }).then(data => {
      if (signal.aborted) return;
      currentIsBuilding = data.current.status === 'Building';

      deploySlot.innerHTML = '';
      deploySlot.appendChild(buildCurrentDeploymentCard(data.current));

      historySlot.innerHTML = '';
      historySlot.appendChild(buildDeployHistoryCard(data.history, signal, refreshDeployments));

      startPollingIfBuilding(data.current.status, signal);
    }).catch(() => { /* silent refresh failure */ });
  }

  function startPollingIfBuilding(status: string, sig: AbortSignal): void {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (status === 'Building' && !sig.aborted) {
      pollInterval = setInterval(() => {
        if (sig.aborted) {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }
        refreshDeployments();
      }, 10_000);
    }
  }

  loadData();
}

export function cleanup(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (container) {
    container.innerHTML = '';
    container = null;
  }
}

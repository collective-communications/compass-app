import { apiFetch } from '../api.js';
import { createCard } from '../components/card.js';
import { createStatusDot, type DotStatus } from '../components/status-dot.js';
import { createButton } from '../components/button.js';

// ── Types ──

interface WorkflowData {
  filename: string;
  status: 'healthy' | 'warning' | 'not_created';
  trigger: string;
  branch: string;
  duration: string;
  lastRun: string;
  running: boolean;
}

interface SecretItem {
  name: string;
  configured: boolean;
}

interface SecretsData {
  configured: number;
  total: number;
  secrets: SecretItem[];
  vaultLocked: boolean;
}

interface RunData {
  status: DotStatus;
  workflow: string;
  event: string;
  branch: string;
  duration: string;
  timestamp: string;
}

interface RepoData {
  name: string;
  branch: string;
  url: string;
}

interface HealthData {
  githubConnected: boolean;
}

// ── State ──

let container: HTMLElement | null = null;
let abortController: AbortController | null = null;
let pulseIntervals: ReturnType<typeof setInterval>[] = [];

// ── Helpers ──

function createSkeleton(height: string = '120px'): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('aria-busy', 'true');
  el.setAttribute('aria-label', 'Loading');
  el.style.height = height;
  el.style.background = 'var(--color-border)';
  el.style.borderRadius = 'var(--radius-card)';
  el.style.animation = 'pulse 1.5s ease-in-out infinite';
  return el;
}

function createCodeBadge(text: string): HTMLElement {
  const code = document.createElement('code');
  code.textContent = text;
  code.style.padding = '2px 6px';
  code.style.borderRadius = '4px';
  code.style.background = 'var(--color-bg)';
  code.style.border = '1px solid var(--color-border)';
  code.style.fontSize = 'var(--font-size-sm)';
  code.style.fontFamily = 'monospace';
  return code;
}

function createBadge(text: string, variant: 'healthy' | 'warning' | 'error' | 'unknown' = 'unknown'): HTMLElement {
  const badge = document.createElement('span');
  badge.textContent = text;
  badge.className = `badge--${variant}`;
  badge.style.display = 'inline-block';
  badge.style.padding = '2px 8px';
  badge.style.borderRadius = 'var(--radius-pill)';
  badge.style.fontSize = 'var(--font-size-sm)';
  badge.style.fontWeight = '500';
  return badge;
}

function createDl(items: Array<{ term: string; value: string | HTMLElement }>): HTMLElement {
  const dl = document.createElement('dl');
  dl.style.display = 'grid';
  dl.style.gridTemplateColumns = 'auto 1fr';
  dl.style.gap = 'var(--space-sm) var(--space-md)';
  dl.style.margin = '0';
  dl.style.alignItems = 'center';

  for (const item of items) {
    const dt = document.createElement('dt');
    dt.textContent = item.term;
    dt.style.color = 'var(--color-text-secondary)';
    dt.style.fontSize = 'var(--font-size-sm)';

    const dd = document.createElement('dd');
    dd.style.margin = '0';
    dd.style.fontSize = 'var(--font-size-sm)';
    if (typeof item.value === 'string') {
      dd.textContent = item.value;
    } else {
      dd.appendChild(item.value);
    }

    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  return dl;
}

function createCardHeader(title: string, trailing?: HTMLElement): HTMLElement {
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = 'var(--space-md)';

  const h2 = document.createElement('h2');
  h2.textContent = title;
  h2.style.margin = '0';
  h2.style.fontSize = 'var(--font-size-lg)';
  h2.style.fontWeight = '600';
  header.appendChild(h2);

  if (trailing) {
    header.appendChild(trailing);
  }
  return header;
}

// ── Card Builders ──

function buildRepoCard(repo: RepoData): HTMLElement {
  const card = createCard();
  card.appendChild(createCardHeader('Repository'));

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = 'var(--space-md)';
  row.style.flexWrap = 'wrap';

  const name = document.createElement('strong');
  name.textContent = repo.name;
  name.style.fontSize = 'var(--font-size-base)';
  row.appendChild(name);

  row.appendChild(createCodeBadge(repo.branch));

  const link = document.createElement('a');
  link.href = repo.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View on GitHub';
  link.style.fontSize = 'var(--font-size-sm)';
  link.style.color = 'var(--color-text-secondary)';
  link.style.marginLeft = 'auto';
  link.setAttribute('aria-label', `View ${repo.name} on GitHub (opens in new tab)`);
  row.appendChild(link);

  card.appendChild(row);
  return card;
}

function buildWorkflowCards(workflows: WorkflowData[]): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = 'var(--space-md)';

  const h2 = document.createElement('h2');
  h2.textContent = 'Workflows';
  h2.style.margin = '0';
  h2.style.fontSize = 'var(--font-size-lg)';
  h2.style.fontWeight = '600';
  wrapper.appendChild(h2);

  for (const wf of workflows) {
    const isWarning = wf.status === 'warning';
    const isNotCreated = wf.status === 'not_created';
    const card = createCard(isWarning ? { severity: 'warning' } : wf.status === 'healthy' ? { severity: 'healthy' } : undefined);

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = 'var(--space-sm)';
    header.style.marginBottom = 'var(--space-sm)';

    header.appendChild(createCodeBadge(wf.filename));

    const dotStatus: DotStatus = isNotCreated ? 'unknown' : (wf.status === 'healthy' ? 'healthy' : 'warning');
    const dotLabel = isNotCreated ? 'Not Created' : (wf.running ? 'Running' : (wf.status === 'healthy' ? 'Passing' : 'Warning'));
    const dot = createStatusDot(dotStatus, dotLabel);

    // Pulsing animation for running workflows
    if (wf.running) {
      const circle = dot.querySelector('.status-dot__circle') as HTMLElement | null;
      if (circle) {
        circle.style.animation = 'pulse 1s ease-in-out infinite';
      }
    }

    header.appendChild(dot);
    card.appendChild(header);

    if (isNotCreated) {
      const btn = createButton('Create Workflow', {
        onClick: async () => {
          await apiFetch('/api/cicd/workflows/create', {
            method: 'POST',
            body: JSON.stringify({ filename: wf.filename }),
          });
        },
      });
      btn.style.marginTop = 'var(--space-sm)';
      card.appendChild(btn);
    } else {
      const dl = createDl([
        { term: 'Trigger', value: wf.trigger },
        { term: 'Branch', value: wf.branch },
        { term: 'Duration', value: wf.duration },
        { term: 'Last Run', value: wf.lastRun },
      ]);
      card.appendChild(dl);

      if (isWarning) {
        const warn = document.createElement('p');
        warn.textContent = 'Recent failures detected. Check workflow logs.';
        warn.style.color = 'var(--color-text-secondary)';
        warn.style.fontSize = 'var(--font-size-sm)';
        warn.style.marginTop = 'var(--space-sm)';
        warn.style.marginBottom = '0';
        warn.setAttribute('role', 'alert');
        card.appendChild(warn);
      }
    }

    wrapper.appendChild(card);
  }

  return wrapper;
}

function buildSecretsCard(data: SecretsData): HTMLElement {
  const card = createCard();

  const countBadge = createBadge(
    `${data.configured}/${data.total} configured`,
    data.configured === data.total ? 'healthy' : 'warning',
  );

  const headerRow = document.createElement('div');
  headerRow.style.display = 'flex';
  headerRow.style.justifyContent = 'space-between';
  headerRow.style.alignItems = 'center';
  headerRow.style.marginBottom = 'var(--space-md)';
  headerRow.style.flexWrap = 'wrap';
  headerRow.style.gap = 'var(--space-sm)';

  const h2 = document.createElement('h2');
  h2.textContent = 'Repo Secrets';
  h2.style.margin = '0';
  h2.style.fontSize = 'var(--font-size-lg)';
  h2.style.fontWeight = '600';
  headerRow.appendChild(h2);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.alignItems = 'center';
  actions.style.gap = 'var(--space-sm)';
  actions.appendChild(countBadge);

  const syncBtn = createButton('Sync from Vault', {
    variant: 'secondary',
    disabled: data.vaultLocked,
    onClick: async () => {
      await apiFetch('/api/cicd/secrets/sync', { method: 'POST' });
    },
  });
  if (data.vaultLocked) {
    syncBtn.title = 'Vault is locked';
  }
  actions.appendChild(syncBtn);
  headerRow.appendChild(actions);

  card.appendChild(headerRow);

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = '4px';
  list.setAttribute('aria-label', 'Repository secrets');

  for (const secret of data.secrets) {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.padding = 'var(--space-sm) var(--space-md)';
    li.style.borderRadius = '4px';
    li.style.border = '1px solid var(--color-border)';

    if (!secret.configured) {
      li.style.borderLeftWidth = '4px';
      li.style.borderLeftColor = 'var(--color-status-warning)';
    }

    const nameEl = document.createElement('code');
    nameEl.textContent = secret.name;
    nameEl.style.fontSize = 'var(--font-size-sm)';
    nameEl.style.fontFamily = 'monospace';
    li.appendChild(nameEl);

    const statusBadge = createBadge(
      secret.configured ? 'Set' : 'Missing',
      secret.configured ? 'healthy' : 'warning',
    );
    li.appendChild(statusBadge);

    list.appendChild(li);
  }

  card.appendChild(list);
  return card;
}

function buildRecentRunsCard(runs: RunData[], repoUrl: string): HTMLElement {
  const card = createCard();
  card.appendChild(createCardHeader('Recent Runs'));

  if (runs.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No workflow runs found.';
    empty.style.color = 'var(--color-text-muted)';
    empty.style.fontSize = 'var(--font-size-sm)';
    empty.style.margin = '0';
    card.appendChild(empty);
    return card;
  }

  // Desktop table
  const tableWrap = document.createElement('div');
  tableWrap.className = 'runs-table-wrap';
  tableWrap.style.overflowX = 'auto';

  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.fontSize = 'var(--font-size-sm)';
  table.setAttribute('aria-label', 'Recent workflow runs');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of ['Status', 'Workflow', 'Event', 'Branch', 'Duration', 'Time']) {
    const th = document.createElement('th');
    th.textContent = col;
    th.style.textAlign = 'left';
    th.style.padding = 'var(--space-sm)';
    th.style.color = 'var(--color-text-secondary)';
    th.style.fontWeight = '500';
    th.style.borderBottom = '1px solid var(--color-border)';
    th.scope = 'col';
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const run of runs) {
    const tr = document.createElement('tr');

    const tdStatus = document.createElement('td');
    tdStatus.style.padding = 'var(--space-sm)';
    tdStatus.appendChild(createStatusDot(run.status, run.status));
    tr.appendChild(tdStatus);

    for (const val of [run.workflow, run.event, run.branch, run.duration, run.timestamp]) {
      const td = document.createElement('td');
      td.style.padding = 'var(--space-sm)';
      td.textContent = val;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  card.appendChild(tableWrap);

  // Mobile stacked rows
  const mobileList = document.createElement('div');
  mobileList.className = 'runs-mobile-list';
  mobileList.style.display = 'none';
  mobileList.setAttribute('aria-label', 'Recent workflow runs');

  for (const run of runs) {
    const item = document.createElement('div');
    item.style.padding = 'var(--space-sm) 0';
    item.style.borderBottom = '1px solid var(--color-border)';

    const line1 = document.createElement('div');
    line1.style.display = 'flex';
    line1.style.alignItems = 'center';
    line1.style.gap = 'var(--space-sm)';
    line1.appendChild(createStatusDot(run.status, run.status));
    const wfName = document.createElement('strong');
    wfName.textContent = run.workflow;
    wfName.style.fontSize = 'var(--font-size-sm)';
    line1.appendChild(wfName);
    item.appendChild(line1);

    const line2 = document.createElement('div');
    line2.style.fontSize = 'var(--font-size-sm)';
    line2.style.color = 'var(--color-text-secondary)';
    line2.style.marginTop = '2px';
    line2.textContent = `${run.event} · ${run.branch} · ${run.duration} · ${run.timestamp}`;
    item.appendChild(line2);

    mobileList.appendChild(item);
  }
  card.appendChild(mobileList);

  // Footer link
  const footer = document.createElement('div');
  footer.style.marginTop = 'var(--space-md)';
  footer.style.textAlign = 'right';

  const viewAll = document.createElement('a');
  viewAll.href = `${repoUrl}/actions`;
  viewAll.target = '_blank';
  viewAll.rel = 'noopener noreferrer';
  viewAll.textContent = 'View all runs';
  viewAll.style.fontSize = 'var(--font-size-sm)';
  viewAll.style.color = 'var(--color-text-secondary)';
  viewAll.setAttribute('aria-label', 'View all workflow runs on GitHub (opens in new tab)');
  footer.appendChild(viewAll);
  card.appendChild(footer);

  return card;
}

function buildErrorState(message: string): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('role', 'alert');
  el.style.color = 'var(--color-text-secondary)';
  el.style.fontSize = 'var(--font-size-sm)';
  el.style.padding = 'var(--space-lg)';
  el.textContent = message;
  return el;
}

// ── Layout ──

function buildLayout(
  repo: RepoData,
  workflows: WorkflowData[],
  secrets: SecretsData,
  runs: RunData[],
): HTMLElement {
  const layout = document.createElement('div');
  layout.className = 'cicd-layout';
  layout.style.display = 'flex';
  layout.style.flexDirection = 'column';
  layout.style.gap = 'var(--space-md)';

  // Repo card — full width
  layout.appendChild(buildRepoCard(repo));

  // Middle row: workflows + secrets — 2-col on desktop
  const middleRow = document.createElement('div');
  middleRow.className = 'cicd-layout__middle';
  middleRow.style.display = 'grid';
  middleRow.style.gap = 'var(--space-md)';
  middleRow.style.gridTemplateColumns = '1fr';

  middleRow.appendChild(buildWorkflowCards(workflows));
  middleRow.appendChild(buildSecretsCard(secrets));
  layout.appendChild(middleRow);

  // Recent runs — full width
  layout.appendChild(buildRecentRunsCard(runs, repo.url));

  injectCicdStyles();
  return layout;
}

let stylesInjected = false;

function injectCicdStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @media (min-width: 768px) {
      .cicd-layout__middle {
        grid-template-columns: 55fr 45fr !important;
      }
      .runs-mobile-list { display: none !important; }
      .runs-table-wrap { display: block !important; }
    }
    @media (max-width: 767px) {
      .runs-table-wrap { display: none !important; }
      .runs-mobile-list { display: block !important; }
    }
  `;
  document.head.appendChild(style);
}

// ── Render / Cleanup ──

export function render(target: HTMLElement): void {
  container = target;
  abortController = new AbortController();
  const signal = abortController.signal;

  const heading = document.createElement('h1');
  heading.className = 'screen-heading';
  heading.textContent = 'CI/CD';
  container.appendChild(heading);

  // Skeletons
  const skeletons = document.createElement('div');
  skeletons.style.display = 'grid';
  skeletons.style.gap = 'var(--space-md)';
  skeletons.appendChild(createSkeleton('80px'));
  skeletons.appendChild(createSkeleton('200px'));
  skeletons.appendChild(createSkeleton('160px'));
  container.appendChild(skeletons);

  // Check health first
  const healthPromise = apiFetch<HealthData>('/api/cicd/health', { signal });

  healthPromise
    .then((health) => {
      if (!container || signal.aborted) return;

      if (!health.githubConnected) {
        skeletons.remove();
        container.appendChild(buildErrorState(
          'GitHub token not configured. Add a GitHub personal access token in Secrets to enable CI/CD monitoring.',
        ));
        return;
      }

      // Parallel fetches
      return Promise.all([
        apiFetch<RepoData>('/api/cicd/repo', { signal }),
        apiFetch<WorkflowData[]>('/api/cicd/workflows', { signal }),
        apiFetch<SecretsData>('/api/cicd/secrets', { signal }),
        apiFetch<RunData[]>('/api/cicd/runs', { signal }),
      ]).then(([repo, workflows, secrets, runs]) => {
        if (!container || signal.aborted) return;
        skeletons.remove();
        container.appendChild(buildLayout(repo, workflows, secrets, runs));
      });
    })
    .catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!container) return;
      skeletons.remove();
      container.appendChild(buildErrorState(
        `Failed to load CI/CD data: ${err instanceof Error ? err.message : 'Unknown error'}`,
      ));
    });
}

export function cleanup(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  for (const id of pulseIntervals) {
    clearInterval(id);
  }
  pulseIntervals = [];
  if (container) {
    container.innerHTML = '';
    container = null;
  }
  stylesInjected = false;
}

import { apiFetch } from '../api.js';
import { createCard } from '../components/card.js';
import { createStatusDot, type DotStatus } from '../components/status-dot.js';
import { createButton } from '../components/button.js';
import { createCopyButton } from '../components/copy-button.js';
import { createProgressBar } from '../components/progress-bar.js';

// ── Types ──

interface DomainData {
  status: 'verified' | 'pending' | 'not_configured';
  domain: string;
  provider: string;
  plan: string;
}

interface DnsRecord {
  type: 'SPF' | 'DKIM' | 'DMARC';
  verified: boolean;
  host: string;
  value: string;
}

interface SendingStats {
  sent: number;
  limit: number;
  remaining: number;
  rateLimit?: string;
  bounceRate?: string;
}

interface ApiKeyData {
  name: string;
  created: string;
  permission: string;
  domainRestriction: string;
  vaultSynced: boolean;
  vaultKey: string;
}

interface EmailData {
  domain: DomainData;
  dns: DnsRecord[];
  stats: SendingStats;
  apiKey: ApiKeyData;
}

// ── State ──

let container: HTMLElement | null = null;
let abortController: AbortController | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

// ── Helpers ──

function createSkeleton(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'skeleton-block';
  el.setAttribute('aria-busy', 'true');
  el.setAttribute('aria-label', 'Loading');
  el.style.height = '120px';
  el.style.background = 'var(--color-border)';
  el.style.borderRadius = 'var(--radius-card)';
  el.style.animation = 'pulse 1.5s ease-in-out infinite';
  return el;
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

function buildDomainStatusCard(domain: DomainData): HTMLElement {
  const card = createCard();

  const statusMap: Record<DomainData['status'], { label: string; variant: 'healthy' | 'warning' | 'unknown' }> = {
    verified: { label: 'Verified', variant: 'healthy' },
    pending: { label: 'Pending', variant: 'warning' },
    not_configured: { label: 'Not Configured', variant: 'unknown' },
  };
  const { label, variant } = statusMap[domain.status];
  const badge = createBadge(label, variant);

  card.appendChild(createCardHeader('Domain Status', badge));

  const dl = createDl([
    { term: 'Domain', value: domain.domain || '—' },
    { term: 'Provider', value: domain.provider || '—' },
    { term: 'Plan', value: domain.plan || '—' },
  ]);
  card.appendChild(dl);

  if (domain.status === 'not_configured') {
    const btn = createButton('Add Domain', {
      onClick: async () => {
        await apiFetch('/api/email/domain', { method: 'POST' });
      },
    });
    btn.style.marginTop = 'var(--space-md)';
    card.appendChild(btn);
  } else if (domain.status === 'pending') {
    const btn = createButton('Verify Domain', {
      variant: 'secondary',
      onClick: async () => {
        await apiFetch('/api/email/domain/verify', { method: 'POST' });
      },
    });
    btn.style.marginTop = 'var(--space-md)';
    card.appendChild(btn);
  }

  return card;
}

function buildDnsRecordsCard(records: DnsRecord[], domainConfigured: boolean): HTMLElement {
  const card = createCard();
  card.appendChild(createCardHeader('DNS Records'));

  if (!domainConfigured) {
    const empty = document.createElement('p');
    empty.textContent = 'Configure a domain to view DNS records.';
    empty.style.color = 'var(--color-text-muted)';
    empty.style.fontSize = 'var(--font-size-sm)';
    empty.style.margin = '0';
    card.appendChild(empty);
    return card;
  }

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.style.margin = '0';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = 'var(--space-sm)';
  list.setAttribute('aria-label', 'DNS records');

  for (const record of records) {
    const li = document.createElement('li');
    li.style.border = '1px solid var(--color-border)';
    li.style.borderRadius = 'var(--radius-card)';
    li.style.padding = 'var(--space-md)';

    if (!record.verified) {
      li.style.borderLeftWidth = '4px';
      li.style.borderLeftColor = 'var(--color-status-warning)';
    }

    // Desktop layout
    const row = document.createElement('div');
    row.className = 'dns-row';
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = 'var(--space-md)';
    row.style.flexWrap = 'wrap';

    const typeBadge = createCodeBadge(record.type);
    row.appendChild(typeBadge);

    const statusIcon = record.verified
      ? createStatusDot('healthy', 'Verified')
      : createStatusDot('warning', 'Unverified');
    row.appendChild(statusIcon);

    // Host field
    const hostGroup = document.createElement('div');
    hostGroup.style.display = 'flex';
    hostGroup.style.alignItems = 'center';
    hostGroup.style.gap = 'var(--space-sm)';
    hostGroup.style.flex = '1';
    hostGroup.style.minWidth = '0';

    const hostLabel = document.createElement('span');
    hostLabel.style.fontSize = 'var(--font-size-sm)';
    hostLabel.style.color = 'var(--color-text-secondary)';
    hostLabel.textContent = 'Host:';
    hostGroup.appendChild(hostLabel);

    const hostValue = document.createElement('span');
    hostValue.style.fontSize = 'var(--font-size-sm)';
    hostValue.style.overflow = 'hidden';
    hostValue.style.textOverflow = 'ellipsis';
    hostValue.style.whiteSpace = 'nowrap';
    hostValue.textContent = record.host;
    hostGroup.appendChild(hostValue);

    const hostCopy = createCopyButton(() => record.host);
    hostGroup.appendChild(hostCopy);
    row.appendChild(hostGroup);

    // Value field
    const valueGroup = document.createElement('div');
    valueGroup.style.display = 'flex';
    valueGroup.style.alignItems = 'center';
    valueGroup.style.gap = 'var(--space-sm)';
    valueGroup.style.flex = '1';
    valueGroup.style.minWidth = '0';

    const valueLabel = document.createElement('span');
    valueLabel.style.fontSize = 'var(--font-size-sm)';
    valueLabel.style.color = 'var(--color-text-secondary)';
    valueLabel.textContent = 'Value:';
    valueGroup.appendChild(valueLabel);

    const valSpan = document.createElement('span');
    valSpan.style.fontSize = 'var(--font-size-sm)';
    valSpan.style.overflow = 'hidden';
    valSpan.style.textOverflow = 'ellipsis';
    valSpan.style.whiteSpace = 'nowrap';
    valSpan.textContent = record.value;
    valueGroup.appendChild(valSpan);

    const valueCopy = createCopyButton(() => record.value);
    valueGroup.appendChild(valueCopy);
    row.appendChild(valueGroup);

    li.appendChild(row);

    // Mobile expandable
    const toggleId = `dns-detail-${record.type}`;
    const toggle = document.createElement('button');
    toggle.className = 'dns-expand-toggle';
    toggle.textContent = `${record.type} details`;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', toggleId);
    toggle.style.display = 'none'; // shown via media query
    toggle.style.width = '100%';
    toggle.style.background = 'none';
    toggle.style.border = 'none';
    toggle.style.padding = 'var(--space-sm) 0';
    toggle.style.cursor = 'pointer';
    toggle.style.fontSize = 'var(--font-size-sm)';
    toggle.style.color = 'var(--color-text-secondary)';
    toggle.style.textAlign = 'left';

    const detail = document.createElement('div');
    detail.id = toggleId;
    detail.className = 'dns-detail';
    detail.style.display = 'none';

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      detail.style.display = expanded ? 'none' : 'block';
    });

    li.appendChild(toggle);
    li.appendChild(detail);

    list.appendChild(li);
  }

  card.appendChild(list);
  return card;
}

function buildSendingStatsCard(stats: SendingStats): HTMLElement {
  const card = createCard();
  card.appendChild(createCardHeader('Sending Stats'));

  const pct = stats.limit > 0 ? stats.sent / stats.limit : 0;
  const isWarning = pct >= 0.8;

  // Large count
  const count = document.createElement('div');
  count.style.fontSize = 'var(--font-size-xl)';
  count.style.fontWeight = '600';
  count.style.marginBottom = 'var(--space-sm)';
  const sentSpan = document.createElement('span');
  sentSpan.textContent = stats.sent.toLocaleString();
  count.appendChild(sentSpan);
  const limitSpan = document.createElement('span');
  limitSpan.textContent = ` / ${stats.limit.toLocaleString()}`;
  limitSpan.style.color = 'var(--color-text-muted)';
  count.appendChild(limitSpan);
  card.appendChild(count);

  // Progress bar
  const bar = createProgressBar({ value: stats.sent, max: stats.limit });
  card.appendChild(bar);

  if (isWarning) {
    const warn = document.createElement('p');
    warn.textContent = `Monthly send limit is at ${Math.round(pct * 100)}%. Consider upgrading your plan.`;
    warn.style.color = 'var(--color-text-secondary)';
    warn.style.fontSize = 'var(--font-size-sm)';
    warn.style.marginTop = 'var(--space-sm)';
    warn.style.marginBottom = '0';
    warn.setAttribute('role', 'alert');
    card.appendChild(warn);
  }

  // Sub-metrics
  const dl = createDl([
    { term: 'Remaining', value: (stats.remaining ?? 0).toLocaleString() },
    { term: 'Rate Limit', value: stats.rateLimit ?? '2/sec' },
    { term: 'Bounce Rate', value: stats.bounceRate ?? '—' },
  ]);
  dl.style.marginTop = 'var(--space-md)';
  card.appendChild(dl);

  return card;
}

function buildApiKeyCard(apiKey: ApiKeyData): HTMLElement {
  const card = createCard();
  card.appendChild(createCardHeader('API Key'));

  const vaultStatus: DotStatus = apiKey.vaultSynced ? 'healthy' : 'warning';
  const vaultDot = createStatusDot(vaultStatus, apiKey.vaultSynced ? 'Synced' : 'Not Synced');
  const vaultKeyCode = createCodeBadge(apiKey.vaultKey);
  const permBadge = createBadge(apiKey.permission, 'healthy');

  const dl = createDl([
    { term: 'Key Name', value: apiKey.name },
    { term: 'Created', value: apiKey.created },
    { term: 'Permission', value: permBadge },
    { term: 'Domain Restriction', value: apiKey.domainRestriction || '—' },
    { term: 'Vault Sync', value: vaultDot },
    { term: 'Vault Key', value: vaultKeyCode },
  ]);
  card.appendChild(dl);

  return card;
}

// ── Grid Layout ──

function buildGrid(data: EmailData): HTMLElement {
  const grid = document.createElement('div');
  grid.className = 'email-grid';
  grid.style.display = 'grid';
  grid.style.gap = 'var(--space-md)';
  grid.style.gridTemplateColumns = '1fr';

  const domainCard = buildDomainStatusCard(data.domain);
  const dnsCard = buildDnsRecordsCard(data.dns, data.domain.status !== 'not_configured');
  const statsCard = buildSendingStatsCard(data.stats);
  const apiKeyCard = buildApiKeyCard(data.apiKey);

  // Wrap for desktop 2-column layout
  const topRow = document.createElement('div');
  topRow.className = 'email-grid__row';
  topRow.style.display = 'grid';
  topRow.style.gap = 'var(--space-md)';
  topRow.style.gridTemplateColumns = '1fr';
  topRow.appendChild(domainCard);
  topRow.appendChild(statsCard);

  const bottomRow = document.createElement('div');
  bottomRow.className = 'email-grid__row';
  bottomRow.style.display = 'grid';
  bottomRow.style.gap = 'var(--space-md)';
  bottomRow.style.gridTemplateColumns = '1fr';
  bottomRow.appendChild(dnsCard);
  bottomRow.appendChild(apiKeyCard);

  grid.appendChild(topRow);
  grid.appendChild(bottomRow);

  // Inject desktop styles
  injectEmailStyles();

  return grid;
}

let stylesInjected = false;

function injectEmailStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @media (min-width: 768px) {
      .email-grid__row {
        grid-template-columns: 3fr 2fr !important;
      }
      .dns-expand-toggle { display: none !important; }
      .dns-row { display: flex !important; }
    }
    @media (max-width: 767px) {
      .dns-row { display: none !important; }
      .dns-expand-toggle { display: block !important; }
    }
  `;
  document.head.appendChild(style);
}

// ── Render / Cleanup ──

export function render(target: HTMLElement): void {
  container = target;
  abortController = new AbortController();

  const heading = document.createElement('h1');
  heading.className = 'screen-heading';
  heading.textContent = 'Email';
  container.appendChild(heading);

  // Skeleton placeholders
  const skeletons = document.createElement('div');
  skeletons.style.display = 'grid';
  skeletons.style.gap = 'var(--space-md)';
  for (let i = 0; i < 4; i++) {
    skeletons.appendChild(createSkeleton());
  }
  container.appendChild(skeletons);

  // Sequential fetches to respect Resend 2/sec rate limit
  const signal = abortController.signal;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const domainPromise = apiFetch<DomainData>('/api/email/domain', { signal });
  const statsPromise = domainPromise.then(() => delay(600)).then(() => apiFetch<SendingStats>('/api/email/stats', { signal }));
  const keyPromise = statsPromise.then(() => delay(600)).then(() => apiFetch<ApiKeyData>('/api/email/keys', { signal }));

  Promise.all([domainPromise, statsPromise, keyPromise])
    .then(([rawDomain, stats, rawKeys]) => {
      if (!container || signal.aborted) return;

      // Normalize domain response to DomainData shape
      const rd = rawDomain as Record<string, unknown>;
      const domain: DomainData = {
        status: (rd.status === 'verified' ? 'verified' : rd.status === 'pending' ? 'pending' : 'not_configured') as DomainData['status'],
        domain: (rd.name ?? rd.domain ?? '—') as string,
        provider: (rd.provider ?? 'Resend') as string,
        plan: (rd.plan ?? 'Free') as string,
      };

      // Normalize keys response to single ApiKeyData
      const keysArr = Array.isArray(rawKeys) ? rawKeys as Array<Record<string, unknown>> : [];
      const firstKey = keysArr[0];
      const apiKey: ApiKeyData = firstKey ? {
        name: (firstKey.name ?? '—') as string,
        created: (firstKey.createdAt ?? firstKey.created ?? '—') as string,
        permission: (firstKey.permission ?? 'send') as string,
        domainRestriction: (firstKey.domainId ?? '—') as string,
        vaultSynced: true,
        vaultKey: 'RESEND_CCC_SEND',
      } : {
        name: '—', created: '—', permission: '—',
        domainRestriction: '—', vaultSynced: false, vaultKey: '—',
      };

      // Fetch DNS only if domain is configured
      const dnsPromise = domain.status !== 'not_configured'
        ? apiFetch<Array<Record<string, unknown>>>('/api/email/dns', { signal }).then((raw) =>
            raw.map((r): DnsRecord => {
              // Map record type: TXT→SPF, first CNAME→DKIM, second→DMARC
              const rType = String(r.type ?? r.record ?? 'TXT');
              const name = String(r.name ?? r.host ?? '');
              let dnsType: DnsRecord['type'] = 'SPF';
              if (rType === 'CNAME') dnsType = name.includes('domainkey') ? 'DKIM' : 'DMARC';
              return {
                type: dnsType,
                verified: r.status === 'verified',
                host: name,
                value: String(r.value ?? ''),
              };
            })
          )
        : Promise.resolve([] as DnsRecord[]);

      return dnsPromise.then((dns) => {
        if (!container || signal.aborted) return;
        skeletons.remove();
        const grid = buildGrid({ domain, dns, stats, apiKey });
        container.appendChild(grid);
      });
    })
    .catch((err: unknown) => {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!container) return;
      skeletons.remove();

      const errorEl = document.createElement('div');
      errorEl.setAttribute('role', 'alert');
      errorEl.style.color = 'var(--color-text-secondary)';
      errorEl.style.fontSize = 'var(--font-size-sm)';
      errorEl.style.padding = 'var(--space-lg)';
      errorEl.textContent = `Failed to load email configuration: ${err instanceof Error ? err.message : 'Unknown error'}`;
      container.appendChild(errorEl);
    });
}

export function cleanup(): void {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  if (refreshInterval !== null) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  if (container) {
    container.innerHTML = '';
    container = null;
  }
  stylesInjected = false;
}

import { GitHubAdapter } from './adapter.js';
import { registerCicdRoutes } from './routes.js';
import type { DetailSection, DotStatus, ProviderPluginFactory } from '../../src/types/plugin.js';
import { REQUIRED_SECRETS } from './types.js';

/** Map a workflow run's status/conclusion pair to a DotStatus for the UI. */
function runDotStatus(
  status: string,
  conclusion: string | null,
): DotStatus {
  if (status === 'in_progress' || status === 'queued' || status === 'pending') {
    return 'warning';
  }
  if (status !== 'completed') return 'unknown';
  switch (conclusion) {
    case 'success':
      return 'healthy';
    case 'failure':
    case 'cancelled':
    case 'timed_out':
    case 'startup_failure':
      return 'error';
    case 'skipped':
    case 'neutral':
      return 'unknown';
    default:
      return 'unknown';
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}

export function createGitHubPlugin(): ProviderPluginFactory {
  return ({ secrets, vaultClient: _vaultClient, getSecret }) => {
    const owner = secrets.get('GITHUB_OWNER') ?? '';
    const repo = secrets.get('GITHUB_REPO') ?? '';
    const adapter = new GitHubAdapter({
      token: secrets.get('GITHUB_TOKEN') ?? '',
      owner,
      repo,
      resolve: {
        token: () => getSecret('GITHUB_TOKEN'),
      },
    });

    return {
      id: 'github',
      displayName: 'GitHub',
      adapter,
      secretMappings: [
        { vaultKey: 'VITE_SUPABASE_URL' },
        { vaultKey: 'VITE_SUPABASE_ANON_KEY' },
        { vaultKey: 'SUPABASE_URL' },
        { vaultKey: 'SUPABASE_SERVICE_ROLE_KEY' },
        { vaultKey: 'SUPABASE_ACCESS_TOKEN' },
        { vaultKey: 'VERCEL_TOKEN' },
        { vaultKey: 'VERCEL_ORG_ID' },
        { vaultKey: 'VERCEL_PROJECT_ID' },
        { vaultKey: 'RESEND_CCC_SEND' },
        { vaultKey: 'OPENAI_API_KEY' },
        { vaultKey: 'E2E_SUPABASE_URL' },
        { vaultKey: 'E2E_SUPABASE_SERVICE_KEY' },
      ],
      syncTarget: {
        setSecret: (key, value) => adapter.setSecret(key, value),
        listSecrets: () => adapter.listSecrets(),
        verifiable: false,
      },
      deploySteps: [],
      screen: {
        label: 'CI/CD',
        path: '/cicd',
        modulePath: 'provider-screens/cicd.js',
        detailSections: buildGitHubDetailSections,
      },
      registerRoutes(router, ctx) {
        registerCicdRoutes(router, adapter, ctx.syncEngine, ctx.vaultClient);
      },
    };

    /**
     * Build Deploy-screen detail sections for GitHub. Returns an empty
     * array when the adapter has no token. Each sub-fetch is isolated in
     * its own try/catch so a failure (rate limit, auth, network) only
     * drops that one section.
     */
    async function buildGitHubDetailSections(): Promise<DetailSection[]> {
      let token = '';
      try {
        token = await getSecret('GITHUB_TOKEN');
      } catch {
        // Vault offline/locked — treat as not configured.
      }
      if (!token) {
        return [];
      }

      const sections: DetailSection[] = [];

      // 1. Repository (kv) — owner, repo, and public/private visibility
      // from the healthCheck response (the only repo metadata the adapter
      // currently exposes).
      try {
        const health = await adapter.healthCheck();
        const details = (health.details ?? {}) as Record<string, unknown>;
        const isPrivate = details.private;
        sections.push({
          kind: 'kv',
          title: 'Repository',
          items: [
            { label: 'Owner', value: owner || null },
            { label: 'Repo', value: repo || null },
            { label: 'Full Name', value: typeof details.repo === 'string' ? details.repo : null },
            {
              label: 'Visibility',
              value: typeof isPrivate === 'boolean' ? (isPrivate ? 'private' : 'public') : null,
            },
          ],
        });
      } catch (err) {
        console.warn('[github.detailSections] repository skipped:', err);
      }

      // 2. Workflows (list) — each known workflow with its last-run status.
      try {
        const workflows = await adapter.getWorkflows();
        sections.push({
          kind: 'list',
          title: 'Workflows',
          items: workflows.map((wf) => {
            if (wf.state === 'not_created') {
              return {
                label: wf.filename,
                meta: 'not created',
                status: 'unknown' as DotStatus,
              };
            }
            const last = wf.lastRun;
            if (!last) {
              return { label: wf.filename, meta: 'no runs', status: 'unknown' as DotStatus };
            }
            const conclusion = last.conclusion ?? last.status;
            return {
              label: wf.filename,
              meta: `last: ${conclusion}`,
              status: runDotStatus(last.status, last.conclusion),
            };
          }),
        });
      } catch (err) {
        console.warn('[github.detailSections] workflows skipped:', err);
      }

      // 3. Recent Runs (list) — top 5 across all workflows.
      try {
        const runs = await adapter.getRecentRuns(5);
        sections.push({
          kind: 'list',
          title: 'Recent Runs',
          items: runs.map((r) => ({
            label: `#${r.id} · ${r.event}`,
            meta: `${r.branch} · ${formatDuration(r.durationMs)}`,
            status: runDotStatus(r.status, r.conclusion),
          })),
        });
      } catch (err) {
        console.warn('[github.detailSections] recent runs skipped:', err);
      }

      // 4. Secrets (progress) — how many of the required secrets are
      // configured on the repo.
      try {
        const configured = new Set(await adapter.listSecrets());
        const present = REQUIRED_SECRETS.filter((name) => configured.has(name));
        sections.push({
          kind: 'progress',
          title: 'Secrets',
          current: present.length,
          total: REQUIRED_SECRETS.length,
          meta:
            present.length === REQUIRED_SECRETS.length
              ? 'all required secrets configured'
              : `missing: ${REQUIRED_SECRETS.filter((n) => !configured.has(n)).join(', ')}`,
        });
      } catch (err) {
        console.warn('[github.detailSections] secrets skipped:', err);
      }

      return sections;
    }
  };
}

import type { GitHubAdapter } from './adapter.js';
import type { VaultClient } from '../../src/types/vault.js';
import type { Router } from '../../src/api/router.js';
import { jsonSuccess } from '../../src/api/router.js';

export function registerCicdRoutes(
  router: Router,
  github: GitHubAdapter,
  _syncEngine: unknown,
  vaultClient: VaultClient,
): void {
  router.get('/api/cicd/health', async () => {
    try {
      const health = await github.healthCheck();
      return jsonSuccess({
        githubConnected: health.status === 'healthy',
      });
    } catch {
      return jsonSuccess({
        githubConnected: false,
        error: 'GitHub API unavailable — check vault/token',
      });
    }
  });

  router.get('/api/cicd/repo', async () => {
    try {
      const health = await github.healthCheck();
      const details = health.details as Record<string, unknown> | undefined;
      const repoName = (details?.repo as string) ?? '';
      return jsonSuccess({
        name: repoName || health.label || 'unknown',
        branch: 'main',
        url: repoName ? `https://github.com/${repoName}` : '',
      });
    } catch {
      return jsonSuccess({
        name: 'unavailable',
        branch: 'main',
        url: '',
        error: 'GitHub API unavailable — check vault/token',
      });
    }
  });

  router.get('/api/cicd/workflows', async () => {
    let workflows;
    try {
      workflows = await github.getWorkflows();
    } catch {
      return jsonSuccess([]);
    }
    // Normalize WorkflowStatus[] → UI WorkflowData[] shape
    return jsonSuccess(workflows.map((wf) => ({
      filename: wf.filename,
      status: wf.state === 'not_created' ? 'not_created' as const
        : wf.lastRun?.conclusion === 'success' ? 'healthy' as const
        : wf.lastRun?.conclusion === 'failure' ? 'warning' as const
        : 'not_created' as const,
      trigger: wf.lastRun?.event ?? 'push',
      branch: wf.lastRun?.branch ?? 'main',
      duration: wf.lastRun?.durationMs
        ? `${Math.round(wf.lastRun.durationMs / 1000)}s`
        : '—',
      lastRun: wf.lastRun?.createdAt ?? '—',
      running: wf.lastRun?.status === 'in_progress',
    })));
  });

  router.get('/api/cicd/runs', async () => {
    let runs;
    try {
      runs = await github.getRecentRuns();
    } catch {
      return jsonSuccess([]);
    }
    // Normalize WorkflowRun[] → UI RunData[] shape
    return jsonSuccess(runs.map((run) => ({
      status: run.conclusion === 'success' ? 'healthy' as const
        : run.conclusion === 'failure' ? 'warning' as const
        : 'unknown' as const,
      workflow: `Run #${run.id}`,
      url: run.htmlUrl,
      event: run.event,
      branch: run.branch,
      duration: run.durationMs
        ? `${Math.round(run.durationMs / 1000)}s`
        : '—',
      timestamp: run.createdAt,
    })));
  });

  router.get('/api/cicd/secrets', async () => {
    let secretNames: string[] = [];
    let githubError = false;
    try {
      secretNames = await github.listSecrets();
    } catch {
      githubError = true;
    }

    let vaultLocked = false;
    try {
      const status = await vaultClient.getStatus();
      vaultLocked = status.locked;
    } catch {
      vaultLocked = true;
    }

    // Expected secrets for CI/CD
    const expectedSecrets = [
      'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY',
      'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN',
      'VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID',
      'RESEND_CCC_SEND', 'E2E_SUPABASE_URL', 'E2E_SUPABASE_SERVICE_KEY',
    ];

    const secretSet = new Set(secretNames);
    const secrets = expectedSecrets.map((name) => ({
      name,
      configured: githubError ? false : secretSet.has(name),
    }));

    return jsonSuccess({
      configured: secrets.filter((s) => s.configured).length,
      total: secrets.length,
      secrets,
      vaultLocked,
    });
  });

  router.post('/api/cicd/secrets/sync', async () => {
    const vaultSecrets = await vaultClient.getAll();
    const results = [];
    for (const [name, value] of vaultSecrets) {
      try {
        await github.setSecret(name, value);
        results.push({ name, success: true });
      } catch (err) {
        results.push({
          name,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return jsonSuccess(results);
  });

  router.post('/api/cicd/workflows/create-keepalive', async () => {
    const content = `name: Supabase Keepalive
on:
  schedule:
    - cron: '0 0 * * 0'
  workflow_dispatch:
jobs:
  keepalive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: |
          curl -s -o /dev/null -w "%{http_code}" \\
            "\${{ secrets.VITE_SUPABASE_URL }}/rest/v1/" \\
            -H "apikey: \${{ secrets.VITE_SUPABASE_ANON_KEY }}"
`;
    await github.createFile(
      '.github/workflows/supabase-keepalive.yml',
      content,
      'ci: add Supabase keepalive workflow',
    );
    return jsonSuccess({ created: 'supabase-keepalive.yml' });
  });
}

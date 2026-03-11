import type { GitHubAdapter } from '../../adapters/github-adapter.js';
import type { SecretsSyncEngine } from '../../domain/secrets-sync-engine.js';
import type { VaultClient } from '../../types/vault.js';
import type { Router } from '../router.js';
import { jsonSuccess } from '../router.js';

export function registerCicdRoutes(
  router: Router,
  github: GitHubAdapter,
  syncEngine: SecretsSyncEngine,
  vaultClient: VaultClient,
): void {
  router.get('/api/cicd/health', async () => {
    const health = await github.healthCheck();
    return jsonSuccess(health);
  });

  router.get('/api/cicd/workflows', async () => {
    const workflows = await github.getWorkflows();
    return jsonSuccess(workflows);
  });

  router.get('/api/cicd/runs', async () => {
    const runs = await github.getRecentRuns();
    return jsonSuccess(runs);
  });

  router.get('/api/cicd/secrets', async () => {
    const secrets = await github.listSecrets();
    return jsonSuccess(secrets);
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

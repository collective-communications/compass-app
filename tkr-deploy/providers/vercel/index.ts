import { VercelAdapter } from './adapter.js';
import { registerFrontendRoutes } from './routes.js';
import type {
  DetailSection,
  ProviderPluginFactory,
  ProviderPlugin,
  SecretMapping,
} from '../../src/types/plugin.js';

/** Short-form date formatter for the detail-section output. */
function formatTimestamp(value: string | number | null | undefined): string | null {
  if (!value) return null;
  try {
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString();
  } catch {
    return String(value);
  }
}

/** Creates the Vercel provider plugin factory. */
export function createVercelPlugin(): ProviderPluginFactory {
  return ({ secrets, vaultClient, getSecret }): ProviderPlugin => {
    const adapter = new VercelAdapter({
      token: secrets.get('VERCEL_TOKEN') ?? '',
      projectId: secrets.get('VERCEL_PROJECT_ID') ?? '',
      orgId: secrets.get('VERCEL_ORG_ID'),
      resolve: {
        token: () => getSecret('VERCEL_TOKEN'),
        projectId: () => getSecret('VERCEL_PROJECT_ID'),
        orgId: () => getSecret('VERCEL_ORG_ID'),
      },
    });

    const secretMappings: SecretMapping[] = [
      { vaultKey: 'VITE_SUPABASE_URL' },
      { vaultKey: 'VITE_SUPABASE_ANON_KEY' },
      { vaultKey: 'VITE_APP_URL' },
    ];

    return {
      id: 'vercel',
      displayName: 'Vercel',
      adapter,
      secretMappings,

      syncTarget: {
        verifiable: true,
        async setSecret(key: string, value: string): Promise<void> {
          await adapter.setEnvVar(key, value);
        },
        async getSecrets(): Promise<Map<string, string>> {
          const envVars = await adapter.getEnvVars();
          const map = new Map<string, string>();
          for (const env of envVars) {
            map.set(env.key, env.value ?? '');
          }
          return map;
        },
      },

      deploySteps: [
        {
          id: 'vercel:triggerBuild',
          label: 'Trigger Vercel build',
          provider: 'vercel',
          order: 300,
          async execute(): Promise<string> {
            const current = await adapter.getCurrentDeployment();
            if (!current) {
              throw new Error('No current deployment to redeploy');
            }
            const uid = await adapter.triggerRedeploy(current.uid);
            return `Triggered build ${uid}`;
          },
        },
        {
          id: 'vercel:waitForBuild',
          label: 'Wait for Vercel build',
          provider: 'vercel',
          order: 400,
          async execute(): Promise<string> {
            const deployments = await adapter.getDeployments(1);
            const latest = deployments[0];
            if (!latest) {
              throw new Error('No deployment found to poll');
            }
            const result = await adapter.pollDeployment(latest.uid);
            return `Build ${result.uid} finished with status ${result.status}`;
          },
        },
      ],

      screen: {
        label: 'Frontend',
        path: '/frontend',
        modulePath: 'provider-screens/frontend.js',
        detailSections: buildVercelDetailSections,
      },

      registerRoutes(router, ctx): void {
        registerFrontendRoutes(router, adapter, ctx.syncEngine, ctx.vaultClient);
      },
    };

    /**
     * Build Deploy-screen detail sections for Vercel from adapter data.
     * Each call is isolated in its own try/catch so a single failure (API
     * rate limit, auth error) only drops that section, not the whole
     * response. Returns an empty array when the adapter has no token.
     */
    async function buildVercelDetailSections(): Promise<DetailSection[]> {
      let token = '';
      try {
        token = await getSecret('VERCEL_TOKEN');
      } catch {
        // Vault offline/locked — treat as not configured.
      }
      if (!token) {
        return [];
      }

      const sections: DetailSection[] = [];

      // 1. Project (kv)
      try {
        const project = await adapter.getProject();
        sections.push({
          kind: 'kv',
          title: 'Project',
          items: [
            { label: 'Name', value: project.name || null },
            { label: 'Framework', value: project.framework ?? null },
            {
              label: 'Production URL',
              value: project.alias[0] ? `https://${project.alias[0]}` : null,
            },
          ],
        });
      } catch (err) {
        console.warn('[vercel.detailSections] project skipped:', err);
      }

      // Fetch deployments once and reuse for the current-deployment kv and
      // deployment-history list below.
      let deployments: Awaited<ReturnType<typeof adapter.getDeployments>> | null = null;
      try {
        deployments = await adapter.getDeployments(10);
      } catch (err) {
        console.warn('[vercel.detailSections] deployments skipped:', err);
      }

      // 2. Current deployment (kv)
      if (deployments) {
        const current =
          deployments.find((d) => d.target === 'production') ?? deployments[0] ?? null;
        if (current) {
          sections.push({
            kind: 'kv',
            title: 'Current Deployment',
            items: [
              {
                label: 'Commit',
                value: current.commitSha ? current.commitSha.slice(0, 7) : null,
              },
              { label: 'Branch', value: current.branch || null },
              { label: 'Status', value: current.status || null },
              {
                label: 'Duration',
                value: current.duration != null ? `${Math.round(current.duration / 1000)}s` : null,
              },
              { label: 'Deployed', value: formatTimestamp(current.createdAt) },
            ],
          });
        }
      }

      // 3. Deployment history (list) — up to the last 5.
      if (deployments && deployments.length > 0) {
        sections.push({
          kind: 'list',
          title: 'Deployment History',
          items: deployments.slice(0, 5).map((d) => {
            const commit = d.commitSha ? d.commitSha.slice(0, 7) : 'no commit';
            const status = d.status || 'UNKNOWN';
            const isReady = status === 'READY';
            const isError = status === 'ERROR' || status === 'CANCELED';
            return {
              label: commit,
              meta: `${d.branch || '—'} · ${status}`,
              status: isReady ? 'healthy' : isError ? 'error' : 'warning',
            };
          }),
        });
      }

      // 4. Environment variables (list) — per-var vault match status.
      try {
        const envVars = await adapter.getEnvVars();

        let vaultSecrets = new Map<string, string>();
        let vaultOnline = false;
        try {
          const vaultHealth = await vaultClient.health();
          if (vaultHealth.connected && !vaultHealth.locked) {
            vaultOnline = true;
            vaultSecrets = await vaultClient.getAll();
          }
        } catch {
          // vault unavailable — each item gets `unknown` status
        }

        sections.push({
          kind: 'list',
          title: 'Environment Variables',
          items: envVars.map((env) => {
            const vercelValue = env.value ?? '';
            const vaultValue = vaultSecrets.get(env.key);
            const encrypted =
              vercelValue === '' ||
              vercelValue === '(encrypted)' ||
              vercelValue.startsWith('eyJ');

            let meta: string;
            let status: 'healthy' | 'warning' | 'error' | 'unknown';
            if (!vaultOnline) {
              meta = 'vault offline';
              status = 'unknown';
            } else if (vaultValue === undefined) {
              meta = 'missing in vault';
              status = 'error';
            } else if (encrypted) {
              // Can't compare ciphertext — presence is sufficient.
              meta = 'present in vault';
              status = 'healthy';
            } else if (vercelValue === vaultValue) {
              meta = 'match';
              status = 'healthy';
            } else {
              meta = 'mismatch';
              status = 'warning';
            }

            return { label: env.key, meta, status };
          }),
        });
      } catch (err) {
        console.warn('[vercel.detailSections] env vars skipped:', err);
      }

      return sections;
    }
  };
}

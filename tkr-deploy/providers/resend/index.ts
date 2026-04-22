import { ResendAdapter } from './adapter.js';
import { registerEmailRoutes } from './routes.js';
import type { DetailSection, ProviderPluginFactory } from '../../src/types/plugin.js';

export interface ResendPluginConfig {
  /** Vault key name for the Resend admin API key. */
  apiKeySecret?: string;
}

export function createResendPlugin(
  config: ResendPluginConfig = {},
): ProviderPluginFactory {
  const apiKeySecret = config.apiKeySecret ?? 'RESEND_API_KEY';

  return ({ secrets, getSecret }) => {
    const adapter = new ResendAdapter({
      apiKey: secrets.get(apiKeySecret) ?? '',
      resolve: {
        apiKey: () => getSecret(apiKeySecret),
      },
    });

    return {
      id: 'resend',
      displayName: 'Resend',
      adapter,
      secretMappings: [],
      syncTarget: undefined,
      deploySteps: [],
      screen: {
        label: 'Email',
        path: '/email',
        modulePath: 'provider-screens/email.js',
        detailSections: buildResendDetailSections,
      },
      registerRoutes(router) {
        registerEmailRoutes(router, adapter);
      },
    };

    /**
     * Build Deploy-screen detail sections for Resend. The adapter's
     * internal health check already caches for 60s and the rate limit is
     * 2 req/sec, so we fetch sections sequentially rather than in parallel
     * to stay well under the limit. An empty array is returned when the
     * adapter has no API key.
     */
    async function buildResendDetailSections(): Promise<DetailSection[]> {
      let apiKey = '';
      try {
        apiKey = await getSecret(apiKeySecret);
      } catch {
        // Vault offline/locked — treat as not configured.
      }
      if (!apiKey) {
        return [];
      }

      const sections: DetailSection[] = [];

      // Fetch the first domain once — both the kv and table sections use
      // the same detail response.
      let domainId: string | null = null;
      let domainSummary: { id: string; name: string; status: string } | null = null;
      try {
        const domains = await adapter.getDomains();
        domainSummary = domains[0] ?? null;
        domainId = domainSummary?.id ?? null;
      } catch (err) {
        console.warn('[resend.detailSections] domains skipped:', err);
      }

      // 1. Domain (kv) + 2. DNS Records (table) — both require the
      // per-domain detail endpoint.
      if (domainId && domainSummary) {
        try {
          const detail = await adapter.getDomain(domainId);
          sections.push({
            kind: 'kv',
            title: 'Domain',
            items: [
              { label: 'Name', value: detail.name || null },
              { label: 'Status', value: detail.status || null },
              { label: 'Region', value: detail.region || null },
            ],
          });

          if (detail.records.length > 0) {
            sections.push({
              kind: 'table',
              title: 'DNS Records',
              columns: ['Type', 'Name', 'Value', 'Status'],
              rows: detail.records.map((r) => [
                r.type,
                r.name,
                r.value,
                r.status === 'verified' ? 'verified' : 'not_started',
              ]),
            });
          }
        } catch (err) {
          console.warn('[resend.detailSections] domain detail skipped:', err);
          // Fall back to the short summary when the detail fetch fails.
          sections.push({
            kind: 'kv',
            title: 'Domain',
            items: [
              { label: 'Name', value: domainSummary.name || null },
              { label: 'Status', value: domainSummary.status || null },
            ],
          });
        }
      }

      // 3. Sending stats (metric-grid)
      try {
        const stats = await adapter.getSendingStats();
        const pct = stats.limit > 0 ? Math.round((stats.sent / stats.limit) * 100) : 0;
        sections.push({
          kind: 'metric-grid',
          title: 'Sending',
          metrics: [
            { label: 'Sent (month)', value: stats.sent.toLocaleString() },
            { label: 'Daily Limit', value: stats.limit.toLocaleString() },
            {
              label: 'Quota Used',
              value: `${pct}%`,
              status: pct >= 80 ? 'warning' : 'healthy',
            },
            { label: 'Remaining', value: stats.remaining.toLocaleString() },
          ],
        });
      } catch (err) {
        console.warn('[resend.detailSections] stats skipped:', err);
      }

      // 4. API Key (kv) — first (most-recently-created) key only.
      try {
        const keys = await adapter.getApiKeys();
        const key = keys[0];
        if (key) {
          sections.push({
            kind: 'kv',
            title: 'API Key',
            items: [
              { label: 'Name', value: key.name || null },
              { label: 'Created', value: key.createdAt || null },
              { label: 'Permission', value: key.permission || null },
              { label: 'Restricted Domain', value: key.domainId ?? null },
            ],
          });
        }
      } catch (err) {
        console.warn('[resend.detailSections] api keys skipped:', err);
      }

      return sections;
    }
  };
}

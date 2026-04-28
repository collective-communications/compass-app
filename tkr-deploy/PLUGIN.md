# tkr-deploy — Provider Plugin Authoring Guide

A provider plugin is a self-contained module that contributes health checks, deploy steps, secret sync, detail sections, and API routes to the tkr-deploy system. The system knows nothing about a provider except what the plugin declares.

---

## 1. Plugin Architecture

```
deploy.config.ts
└── ProviderPluginFactory[]
         │
         ▼ called at boot
    ProviderPlugin
         │
         ├── ProviderAdapter       → HealthAggregator (30s poll)
         ├── SyncTargetAdapter?    → SecretsSyncEngine (secrets matrix + sync)
         ├── SecretMapping[]       → SecretsSyncEngine (which vault keys to sync)
         ├── PluginDeployStep[]    → DeployOrchestrator (steps sorted by order)
         ├── PluginScreen          → manifest + GET /api/providers/:id/sections
         └── registerRoutes()      → HTTP server (plugin-specific endpoints)
```

All interfaces live in `src/types/plugin.ts`. Import from there, not from individual provider files.

---

## 2. ProviderPlugin Interface

```typescript
// src/types/plugin.ts
interface ProviderPlugin {
  readonly id: string;
  readonly displayName: string;
  readonly adapter: ProviderAdapter;
  readonly secretMappings: SecretMapping[];
  readonly syncTarget?: SyncTargetAdapter;
  readonly deploySteps: PluginDeployStep[];
  readonly screen: PluginScreen;
  registerRoutes(router: Router, ctx: PluginRouteContext): void;
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | yes | Unique, lowercase. Used in API paths, activity log, and as the target id in the secrets matrix. |
| `displayName` | `string` | yes | Shown in the UI nav and health dashboard. |
| `adapter` | `ProviderAdapter` | yes | Health check implementation (see §4). |
| `secretMappings` | `SecretMapping[]` | yes (can be `[]`) | Declares which vault keys this plugin needs (see §6). |
| `syncTarget` | `SyncTargetAdapter` | no | Omit if this plugin cannot receive secrets via sync (see §5). |
| `deploySteps` | `PluginDeployStep[]` | yes (can be `[]`) | Ordered steps this plugin contributes to the deploy pipeline (see §7). |
| `screen` | `PluginScreen` | yes | Frontend nav label, path, and detail sections (see §8). |
| `registerRoutes` | `function` | yes | Registers plugin-specific API routes (see §9). |

---

## 3. PluginFactoryContext

Passed to every `ProviderPluginFactory` at boot time:

```typescript
// src/types/plugin.ts
interface PluginFactoryContext {
  /** Boot-time snapshot of vault secrets. May be empty if vault was locked at boot. */
  secrets: Map<string, string>;
  /** Direct vault client. */
  vaultClient: VaultClient;
  /** Lazy secret resolver — always fetches the current value from vault. */
  getSecret(name: string): Promise<string>;
}
```

**Critical:** Always use `getSecret()` inside adapter `resolve` callbacks and deploy step `execute()` functions. The `secrets` snapshot is taken once at boot — it is stale by the time a step actually runs. `getSecret()` fetches the live value on every call.

```typescript
// Correct — lazy resolver
const adapter = new MyAdapter({
  resolve: {
    apiKey: () => getSecret('MY_API_KEY'),
  },
});

// Wrong — stale at runtime
const adapter = new MyAdapter({
  apiKey: secrets.get('MY_API_KEY'),
});
```

---

## 4. ProviderAdapter (Health Checks)

```typescript
// src/types/provider.ts
interface ProviderAdapter {
  readonly name: string;
  healthCheck(): Promise<ProviderHealth>;
}

interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'warning' | 'down' | 'unknown';
  label: string;
  details: Record<string, unknown>;
  checkedAt: number;   // Unix ms timestamp
}
```

`HealthAggregator` wraps each `healthCheck()` call in a 10s timeout. Do not set a shorter internal timeout — the aggregator already handles it.

**Status guidance:**
| Status | When to use |
|--------|------------|
| `healthy` | API reachable, credentials valid, service operational |
| `warning` | API reachable but degraded (rate-limited, quota low, config issue) |
| `down` | API unreachable or authentication failed |
| `unknown` | Cannot determine (e.g. pre-initialization) |

---

## 5. SyncTargetAdapter (Secret Push)

Omit `syncTarget` entirely if your provider cannot receive secrets.

```typescript
// src/types/plugin.ts
interface SyncTargetAdapter {
  setSecret(key: string, value: string): Promise<void>;
  listSecrets?(): Promise<string[]>;
  getSecrets?(): Promise<Map<string, string>>;
  readonly verifiable: boolean;
}
```

| Method | Required | Purpose |
|--------|----------|---------|
| `setSecret(key, value)` | yes | Push one secret to the target. `key` is the `targetKey` from `SecretMapping` (defaults to `vaultKey` if not set). |
| `listSecrets()` | no | Returns secret names at the target. Enables `'missing'` detection. |
| `getSecrets()` | no | Returns current secret values. Enables `'differs'` detection. |
| `verifiable` | yes | Set `true` if `getSecrets()` is implemented; `false` otherwise. |

**Sync state derivation:**
| `verifiable` | `listSecrets` | `getSecrets` | States possible |
|-------------|--------------|-------------|-----------------|
| `false` | — | — | `unverifiable`, `not_applicable` |
| `true` | yes | — | `missing`, `unverifiable`, `not_applicable` |
| `true` | yes | yes | `synced`, `missing`, `differs`, `not_applicable` |

---

## 6. SecretMapping

```typescript
interface SecretMapping {
  vaultKey: string;
  targetKey?: string;  // defaults to vaultKey if omitted
}
```

List every vault key this plugin consumes. For plugins with a `syncTarget`, these mappings drive the sync matrix. For plugins without a `syncTarget`, they appear in the dashboard for visibility only (no sync is performed).

```typescript
// Example: rename vault key for the target
{ vaultKey: 'RESEND_CCC_SEND', targetKey: 'RESEND_API_KEY' }

// Example: same name at both ends
{ vaultKey: 'SUPABASE_URL' }
```

---

## 7. PluginDeployStep

```typescript
interface PluginDeployStep {
  id: string;
  label: string;
  provider: string;
  order: number;
  execute(): Promise<string>;
}
```

| Field | Description |
|-------|-------------|
| `id` | Globally unique across all plugins and core steps. Prefix with your plugin id to avoid collision: `"supabase:pushMigrations"`. |
| `label` | Human-readable; shown in the UI step log. |
| `provider` | Your plugin's `id`. Used for activity log attribution. |
| `order` | Integer. Lower runs first. |
| `execute()` | Async function. Returns a detail string on success (shown in UI). Throws `Error` on failure — halts the run. |

**Ordering convention:**

| Range | Reserved for |
|-------|-------------|
| 0 | `syncSecrets` (core — always runs first) |
| 1–899 | Plugin steps |
| 900 | `healthCheck` (core — always runs last) |

Increment by 100 within your plugin to leave room for insertions. Steps at equal order values execute in registration order. Supabase uses 100/200/300/400; Vercel also uses 300/400 and intentionally interleaves with Supabase.

**Dry-run behaviour:** `execute()` is **never called** during a dry-run. The orchestrator short-circuits at the step boundary and marks the step `'dry-run'`. Your step does not need to check `dryRun` itself.

---

## 8. PluginScreen

```typescript
interface PluginScreen {
  label: string;
  path: string;
  modulePath: string;
  detailSections?(): Promise<DetailSection[]>;
}
```

| Field | Description |
|-------|-------------|
| `label` | Nav pill text (e.g. `"Database"`). |
| `path` | URL path (e.g. `"/database"`). Must be unique across all plugins. Convention: `"/<id>"`. |
| `modulePath` | Module path relative to the UI root for dynamic import. Used by `custom-module` sections. |
| `detailSections()` | Called lazily when the Deploy screen expands this provider's card. **Must return `[]` rather than throwing when credentials are absent.** |

**`detailSections()` contract:**
- Return an empty array, not an error, if the adapter is unconfigured or credentials are missing
- Wrap each remote call in a try/catch; push sections that succeed, skip sections that fail
- Each failed section logs a warning to stderr and is omitted silently

**DetailSection kinds:**

```typescript
type DetailSection =
  | { kind: 'kv';          title: string; items: { label: string; value: string | null }[] }
  | { kind: 'metric-grid'; title: string; metrics: { label: string; value: string; status?: DotStatus }[] }
  | { kind: 'list';        title: string; items: { label: string; meta?: string; status?: DotStatus }[] }
  | { kind: 'progress';    title: string; current: number; total: number; meta?: string }
  | { kind: 'table';       title: string; columns: string[]; rows: string[][] }
  | { kind: 'custom-module'; title: string; modulePath: string };
```

Use `custom-module` when no built-in kind fits. The `modulePath` is dynamically imported by the frontend; it must default-export a Preact component that accepts no required props.

`DotStatus`: `'healthy' | 'warning' | 'error' | 'unknown'`

---

## 9. registerRoutes

```typescript
interface PluginRouteContext {
  vaultClient: VaultClient;
  syncEngine: {
    syncAll(): Promise<{ synced: number; failed: number; errors: string[] }>;
    syncSecret(name: string, targets: string[]): Promise<Array<{ target: string; success: boolean; error?: string }>>;
  };
}
```

Use `router.get()` and `router.post()` (and `router.add()` for other methods). Use path prefix `/api/<id>/` by convention.

```typescript
import { jsonSuccess, jsonError } from '../../src/api/router.js';

registerRoutes(router, ctx) {
  router.get('/api/myplugin/status', async () => {
    return jsonSuccess({ online: true });
  });

  router.get('/api/myplugin/items/:id', async (_req, params) => {
    const item = await this.adapter.getItem(params.id);
    if (!item) return jsonError(`Not found: ${params.id}`, 404);
    return jsonSuccess(item);
  });
}
```

Plugin routes are registered after core routes. Because the router is first-match, plugins cannot override core routes.

---

## 10. Registering a Plugin

In `deploy.config.ts`:

```typescript
import { createMyPlugin } from './providers/myplugin/index.js';

const config: DeployConfig = {
  providers: [
    // ...existing plugins
    createMyPlugin({ someOption: 'value' }),
  ],
};
```

**Canonical file layout:**

```
providers/myplugin/
  index.ts      ← factory; exports createMyPlugin()
  adapter.ts    ← ProviderAdapter implementation
  types.ts      ← plugin-specific types
  routes.ts     ← registerMyRoutes()
```

---

## 11. Minimal Working Plugin

```typescript
// providers/myplugin/index.ts
import type { ProviderPlugin, ProviderPluginFactory, PluginFactoryContext } from '../../src/types/plugin.js';
import type { Router } from '../../src/api/router.js';
import { jsonSuccess } from '../../src/api/router.js';
import type { ProviderAdapter, ProviderHealth } from '../../src/types/provider.js';

class MyAdapter implements ProviderAdapter {
  readonly name = 'myplugin';
  private readonly resolveApiKey: () => Promise<string>;

  constructor(opts: { resolveApiKey: () => Promise<string> }) {
    this.resolveApiKey = opts.resolveApiKey;
  }

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const key = await this.resolveApiKey();
      // ... call your API
      return {
        provider: 'myplugin',
        status: 'healthy',
        label: 'My Service',
        details: {},
        checkedAt: Date.now(),
      };
    } catch {
      return { provider: 'myplugin', status: 'down', label: 'My Service', details: {}, checkedAt: Date.now() };
    }
  }
}

export function createMyPlugin(): ProviderPluginFactory {
  return ({ getSecret }: PluginFactoryContext): ProviderPlugin => {
    const adapter = new MyAdapter({
      resolveApiKey: () => getSecret('MY_API_KEY'),   // always lazy
    });

    return {
      id: 'myplugin',
      displayName: 'My Service',
      adapter,

      secretMappings: [{ vaultKey: 'MY_API_KEY' }],

      // syncTarget omitted — this plugin cannot receive secrets

      deploySteps: [
        {
          id: 'myplugin:doSomething',
          label: 'Do something',
          provider: 'myplugin',
          order: 200,
          execute: async () => {
            const key = await getSecret('MY_API_KEY');
            // ... do the work
            return 'Done';   // detail string shown in UI
          },
        },
      ],

      screen: {
        label: 'My Service',
        path: '/myplugin',
        modulePath: 'src/screens/myplugin.js',
        detailSections: async () => {
          try {
            return [{ kind: 'kv', title: 'Status', items: [{ label: 'API', value: 'connected' }] }];
          } catch {
            return [];   // always return [], never throw
          }
        },
      },

      registerRoutes(router: Router) {
        router.get('/api/myplugin/status', async () => {
          return jsonSuccess({ ok: true });
        });
      },
    };
  };
}
```

---

## 12. Implementation Checklist

- [ ] `id` is lowercase, URL-safe, and globally unique
- [ ] Step `id` values are prefixed with plugin id (e.g. `"myplugin:stepName"`)
- [ ] All adapter credential reads use `getSecret()` in lazy `resolve` callbacks, not the boot-time `secrets` snapshot
- [ ] `detailSections()` returns `[]` (not throws) when credentials are absent or API calls fail
- [ ] `SyncTargetAdapter.verifiable` is `true` only when `getSecrets()` is implemented
- [ ] Step `order` values are in the 1–899 range with 100-step increments within the plugin
- [ ] Custom API routes use the `/api/<id>/` prefix
- [ ] `createMyPlugin()` is a `ProviderPluginFactory` — it returns `(ctx) => ProviderPlugin`, not a bare `ProviderPlugin`
- [ ] Factory is added to `config.providers` in `deploy.config.ts`

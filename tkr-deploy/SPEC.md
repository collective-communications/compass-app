# tkr-deploy — System Specification

## Quick Navigation

| Topic | File |
|-------|------|
| HTTP API (all endpoints, request/response shapes) | [API.md](API.md) |
| Provider plugin authoring | [PLUGIN.md](PLUGIN.md) |
| Frontend architecture (stores, router, components) | [UI.md](UI.md) |
| Credentials setup per-provider | [CREDENTIALS.md](CREDENTIALS.md) |

---

## 1. Purpose and Scope

tkr-deploy is a **run-centric deployment orchestrator dashboard**. It orchestrates multi-provider infrastructure deployments for the compass-app, syncs secrets from a Vault sidecar, streams real-time deploy events, and monitors provider health.

**Is:**
- A deployment runner that sequences steps across providers in a defined order
- A secrets sync hub that pushes Vault values to Supabase, Vercel, and GitHub
- A real-time monitoring dashboard backed by SSE event streaming
- A health aggregator that polls all provider adapters on a 30s interval

**Is not:**
- A secrets vault (delegates to tkr-secrets at port 42042)
- A CI/CD system with git hooks or build triggers
- A cloud provider CLI (all provider operations go through their APIs)

---

## 2. Stack and Runtime

| Concern | Choice |
|---------|--------|
| Runtime | Bun (not Node) |
| Module format | ESM throughout |
| Default port | 42043 |
| UI build | Vite (TypeScript → browser JS, output to `ui/dist/`) |
| UI framework | Preact 10 + @preact/signals |
| Entry point | `serve.ts` |

The UI is rebuilt on every server boot via `build-ui.ts`.

---

## 3. Configuration

### DeployConfig

Defined in `src/types/plugin.ts`, consumed by `deploy.config.ts`:

```typescript
interface DeployConfig {
  /** Dashboard display name shown in the topbar (default: "tkr-deploy"). */
  name?: string;
  /** Vault connection. */
  vault: { url: string; vaultName: string };
  /** HTTP server port (default: 42043). */
  port?: number;
  /** Provider plugin factories to load at boot. */
  providers: ProviderPluginFactory[];
}
```

### Environment Variables

Environment variables override the corresponding `DeployConfig` values.

| Variable | Overrides | Default |
|----------|-----------|---------|
| `DEPLOY_PORT` | `config.port` | `42043` |
| `VAULT_URL` | `config.vault.url` | _(required in config)_ |
| `VAULT_NAME` | `config.vault.vaultName` | _(required in config)_ |

Provider-specific env vars (e.g. `GITHUB_OWNER`, `GITHUB_REPO`) are consumed by individual plugin factories, not by `serve.ts`.

---

## 4. Boot Sequence

Steps as executed in `serve.ts`:

1. **Build UI** — `bun run build-ui.ts` compiles the Preact app to `ui/dist/`
2. **Load config** — import `deploy.config.ts`, resolve port/vault from env overrides
3. **Init VaultHttpClient** — probe connectivity to tkr-secrets; if locked or unreachable, log warning and continue in degraded mode (no secrets loaded)
4. **Load plugins** — call each `ProviderPluginFactory(ctx)` and register into `PluginRegistry`
5. **Build core steps** — `syncSecrets` (order 0) and `healthCheck` (order 900) are registered by `serve.ts` itself; plugin steps are appended and the full array sorted by order
6. **Create domain services** — `EventBus`, `DeployOrchestrator`, `HealthAggregator`
7. **Migrate activity log** — one-shot pass to add `runId` to v1 entries (clusters by 30s timestamp proximity)
8. **Create HTTP server** — register all core API routes, then call `plugin.registerRoutes()` for each plugin
9. **Start server** — bind on configured port
10. **Start health polling** — `healthAggregator.start()` fires immediately then repeats every 30s
11. **Register shutdown** — SIGINT/SIGTERM call `healthAggregator.stop()` + `server.stop()`

---

## 5. Service Graph

```
serve.ts
│
├── VaultHttpClient ──────────────────────► tkr-secrets :42042
│
├── PluginRegistry
│   └── ProviderPlugin × N
│       ├── ProviderAdapter           → healthCheck()
│       ├── SyncTargetAdapter?        → setSecret(), listSecrets?(), getSecrets?()
│       ├── PluginDeployStep[]        → contributed to allSteps
│       ├── PluginScreen              → nav label + detail sections
│       └── registerRoutes()          → plugin-specific HTTP routes
│
├── SecretsSyncEngine ← registry.allSyncTargets() + registry.allSecretMappings()
│
├── DeployOrchestrator ← allSteps (sorted) + EventBus
│   └── activity.json (JSONL append-only log)
│
├── HealthAggregator ← registry.allAdapters() + VaultHttpClient
│   └── 30s polling interval
│
├── EventBus
│   └── DeployOrchestrator publishes → SSE clients subscribe (GET /api/events)
│
└── createServer() → HTTP :42043
    ├── Core routes: /api/health, /api/providers, /api/secrets, /api/secrets/sync,
    │   /api/deploy, /api/events, /api/activity, /api/manifest, /api/providers/:id/sections
    ├── Plugin routes: /api/database/*, /api/frontend/*, /api/email/*, /api/cicd/*
    └── Static fallback: ui/dist/ → SPA index.html
```

---

## 6. Core Deploy Steps

Two steps are registered by `serve.ts` directly (not by any plugin):

| Step ID | Order | Provider | Description |
|---------|-------|----------|-------------|
| `syncSecrets` | 0 | `vault` | Sync all secrets from Vault to every registered `syncTarget`. Returns count of synced/failed. |
| `healthCheck` | 900 | `all` | Run `healthCheck()` on every adapter. Throws if any non-healthy. |

Plugin steps fill order positions **1–899**. See [PLUGIN.md §7](PLUGIN.md) for step ordering conventions.

---

## 7. Shared Primitive Types

These types appear in both the backend core and the frontend. The canonical backend definitions are in `src/types/` and `src/core/event-bus.ts`.

```typescript
// src/types/plugin.ts
type DotStatus = 'healthy' | 'warning' | 'error' | 'unknown';

// src/types/provider.ts
type ProviderStatus = 'healthy' | 'warning' | 'down' | 'unknown';

// src/core/event-bus.ts
type DeployTrigger = 'full' | 'step' | 'resume' | 'dry-run';
type DeployRunStatus = 'success' | 'failed' | 'partial';

// src/core/deploy-orchestrator.ts
interface RunSummary {
  runId: string;
  trigger: DeployTrigger;
  startedAt: string;      // ISO 8601
  finishedAt: string;     // ISO 8601
  status: 'success' | 'partial' | 'failed' | 'dry-run' | 'in-progress';
  stepCount: number;
}
```

---

## 8. Activity Log

| Property | Value |
|----------|-------|
| Path | `tkr-deploy/activity.json` |
| Format | JSONL — one `ActivityLogEntry` JSON object per line |
| Growth | Append-only; no rotation |
| Migration | One-shot at boot: v1 entries (no `runId`) receive synthetic run IDs via 30s timestamp clustering |

### ActivityLogEntry

Defined in `src/types/activity.ts`:

```typescript
interface ActivityLogEntry {
  timestamp: string;         // ISO 8601
  action: string;            // step id or 'run:start' / 'run:complete' / 'run:dry-run'
  provider: string;          // plugin id, or 'core' for orchestrator-level entries
  status: 'success' | 'skipped' | 'failed' | 'dry-run';
  durationMs?: number;       // absent for 'start'/'end' markers
  error?: string;            // present when status === 'failed'
  runId?: string;            // required on v2+ entries
  trigger?: DeployTrigger;
  kind?: 'start' | 'step' | 'end';  // 'step' entries are the useful ones; markers bracket them
  stepId?: string;           // present when kind === 'step'
}
```

`GET /api/activity` returns only `kind === 'step'` entries (plus legacy v1 entries). Run-level markers are filtered out. Use `GET /api/deploy/runs` for run-level views.

---

## 9. Health Polling

| Property | Value |
|----------|-------|
| Poll interval | 30s (configurable via `HealthAggregatorConfig.pollIntervalMs`) |
| Adapter timeout | 10s (configurable via `adapterTimeoutMs`) |
| Vault timeout | same 10s |
| Fires immediately | Yes — first check on `start()`, then on interval |

**Rollup derivation:**
- All statuses `healthy` → `healthy`
- All statuses `down` → `down`
- Any mix → `warning`
- Empty adapters list → `down`

**Note:** `GET /api/health` returns 503 with `"No health data available yet"` until the first poll completes (typically within 1–2s of server start).

# tkr-deploy — HTTP API Reference

## Conventions

**Base URL:** `http://localhost:42043` (port overridden by `DEPLOY_PORT` env var)

**Response envelope:**
```json
{ "success": true, "data": <T> }
{ "success": false, "error": "<message>" }
```
All `/api/*` responses use this envelope. Static file responses (SPA fallback) do not.

**`dryRun` parameter** — accepted by deploy and sync endpoints:
- Query string: `?dryRun=1`, `?dryRun=true`, `?dryRun=yes` (case-insensitive)
- Request body: `{ "dryRun": true }`
- Body takes precedence over query string when both are present

**Common errors:**
| Status | Meaning |
|--------|---------|
| 400 | Missing required parameter or invalid JSON body |
| 404 | Unknown resource (run ID, provider ID, step ID) |
| 409 | Deploy already in progress (`DeployInProgressError`) |
| 503 | Health data not yet available, or vault locked (for deploy endpoints) |

**Router:** first-match wins; path params use `:name` syntax. Plugin routes are registered after core routes.

---

## System Routes

### `GET /api/health`

Provider rollup + vault lock state. Returns 503 before the first health poll completes (~1–2s after boot).

```typescript
// Response data
{
  rollup: 'healthy' | 'warning' | 'down';
  checkedAt: string;            // ISO 8601
  vaultLocked: boolean;         // true if vault is locked or unreachable
  deploymentUrl: string;        // "https://{vercel_label}.vercel.app" or ""
  lastDeployed: null;           // reserved; always null
  providers: Array<{
    provider: string;           // plugin id, e.g. "supabase", "vault"
    status: 'healthy' | 'warning' | 'down' | 'unknown';
    latencyMs: number;
    label: string;
    error?: string;
    checkedAt: string;          // ISO 8601
  }>;
}
```

---

### `GET /api/providers`

List all providers with their current status and navigation route.
Returns 503 before the first health poll.

```typescript
// Response data
{
  providers: Array<{
    id: string;       // plugin id, e.g. "supabase"
    name: string;     // display name
    status: 'healthy' | 'warning' | 'down' | 'unknown';
    metrics: {
      latency: string;   // e.g. "142ms"
      error?: string;
    };
    route: string;    // UI nav path, e.g. "database", "frontend"
  }>;
}
```

---

### `GET /api/manifest`

Dashboard display name and registered screen list. Used by the frontend topbar.

```typescript
// Response data
{
  name: string;   // from DeployConfig.name
  screens: Array<{
    label: string;
    path: string;
    modulePath: string;
    providerId?: string;
  }>;
}
```

---

### `GET /api/activity`

Step-level activity log entries, newest first. Run-level start/end markers are excluded.

**Query:** `?limit=N` (default 50; no enforced maximum)

```typescript
// Response data
{ entries: ActivityLogEntry[] }

// ActivityLogEntry
{
  timestamp: string;    // ISO 8601
  action: string;       // step id (e.g. "supabase:pushMigrations")
  provider: string;     // plugin id
  status: 'success' | 'skipped' | 'failed' | 'dry-run';
  durationMs?: number;
  error?: string;
  runId?: string;
  trigger?: 'full' | 'step' | 'resume' | 'dry-run';
  kind?: 'start' | 'step' | 'end';
  stepId?: string;
}
```

---

## SSE Stream

### `GET /api/events`

Long-lived Server-Sent Events stream. Each deploy lifecycle event is forwarded as a typed SSE frame.

**Response headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Frame format:**
```
event: <kind>
data: <JSON>

```

**System frames:**

| Event | Data | When |
|-------|------|------|
| `connected` | `{}` | Immediately on connection |
| `keepalive` | `{}` | Every 20s (prevents proxy timeouts) |

**DeployEvent frames:**

| `kind` | Additional fields |
|--------|------------------|
| `run:start` | `runId`, `timestamp`, `trigger` |
| `run:complete` | `runId`, `timestamp`, `trigger`, `status: 'success'\|'failed'\|'partial'` |
| `run:dry-run` | `runId`, `timestamp`, `trigger`, `status?: 'success'\|'failed'\|'partial'` |
| `step:start` | `runId`, `timestamp`, `stepId`, `label`, `provider` |
| `step:complete` | `runId`, `timestamp`, `stepId`, `label`, `provider`, `durationMs`, `detail?` |
| `step:fail` | `runId`, `timestamp`, `stepId`, `label`, `provider`, `durationMs`, `error` |

All frames include `kind`, `runId`, and `timestamp` (ISO 8601). The `data` JSON always contains the full discriminated event object.

---

## Secrets Routes

### `GET /api/secrets`

Full vault status + per-secret sync matrix across all registered sync targets.

```typescript
// Response data
{
  vault: {
    name: string;
    locked: boolean;
    secretCount: number;
  };
  secrets: Array<{
    name: string;
    maskedValue: string;   // first 8 chars of SHA256 hash + "••••", or "(empty)"
    outOfSync: boolean;    // true if any target is 'missing' or 'differs'
    targets: Array<{
      name: string;        // display name (e.g. "Supabase", "Vercel")
      id: string;          // plugin id (e.g. "supabase", "vercel")
      state: 'synced' | 'missing' | 'differs' | 'unverifiable' | 'not_applicable';
    }>;
  }>;
}
```

**State values:**
| State | Meaning |
|-------|---------|
| `synced` | Value at target matches vault |
| `missing` | Secret absent at target |
| `differs` | Value at target differs from vault |
| `unverifiable` | Target does not support reading back values (`verifiable: false`) |
| `not_applicable` | No mapping defined for this secret+target pair, or a fetch error occurred |

---

### `POST /api/secrets/sync`

Sync secrets from Vault to registered sync targets. Supports selective sync and dry-run preview.

**Body (optional):**
```typescript
{
  names?: string[];    // specific vault keys to sync; omit to sync all out-of-sync
  targets?: string[];  // specific target plugin ids; omit to sync all targets
  dryRun?: boolean;
}
```

**Response (no `names` — sync all):**
```typescript
// Response data — SyncAllReport from SecretsSyncEngine
{
  dryRun: boolean;
  synced: number;
  failed: number;
  errors: string[];
  wouldSync?: number;  // count when dryRun=true
  // additional fields from SecretsSyncEngine.syncAll()
}
```

**Response (with `names`):**
```typescript
{
  dryRun: boolean;
  wouldSync: number;
  results: Array<{
    name: string;
    results: Array<{
      target: string;
      success: boolean;
      wouldSync?: boolean;
      error?: string;
    }>;
  }>;
}
```

---

### `POST /api/secrets/:name/sync`

Sync one secret by vault key name.

**Path param:** `name` — vault key name

**Query:** `?targetIds=supabase,vercel` (comma-separated; optional)

**Body (optional):**
```typescript
{
  targetIds?: string[];  // also accepted as "targets"
  targets?: string[];
  dryRun?: boolean;
}
```

**Response:**
```typescript
{
  name: string;
  dryRun: boolean;
  wouldSync: number;
  results: Array<{
    target: string;
    success: boolean;
    wouldSync?: boolean;
    error?: string;
  }>;
}
```

---

## Deploy Routes

### `POST /api/deploy`

Trigger a full deploy (all steps in order). Halts on first failure.

**Query/Body:** `dryRun`

**Errors:**
- `409` — `"A deployment is already in progress"`
- `500` — `"Vault is locked — unlock before deploying"`
- `400` — `"Invalid JSON body"`

**Response (DeployReport):**
```typescript
{
  status: 'success' | 'partial' | 'failed';
  startedAt: string;         // ISO 8601
  completedAt: string;       // ISO 8601
  totalDurationMs: number;
  steps: Array<{
    stepId: string;
    status: 'success' | 'failed' | 'skipped' | 'dry-run';
    durationMs: number;
    detail?: string;
    error?: string;
  }>;
  failedAtStep?: string;     // step id of the first failure
  runId: string;
  trigger: 'full' | 'step' | 'resume' | 'dry-run';
}
```

**Status derivation:**
- `dryRun=true` → always `success` regardless of step results
- First step failed → `failed`
- Subsequent step failed (at least one succeeded before it) → `partial`
- All steps succeeded → `success`

---

### `POST /api/deploy/step/:id`

Execute a single step by ID.

**Path param:** `id` — step id (e.g. `"syncSecrets"`, `"supabase:pushMigrations"`)

**Errors:**
- `409` — deploy already in progress
- `500` — `"Unknown step: <id>"`

**Response (StepResult):**
```typescript
{
  stepId: string;
  status: 'success' | 'failed' | 'skipped' | 'dry-run';
  durationMs: number;
  detail?: string;
  error?: string;
}
```

---

### `POST /api/deploy/resume`

Resume a failed run by executing from a given step onward. Generates a fresh `runId`; trigger is `'resume'`.

**Query:** `?from=<stepId>` (required)

**Errors:**
- `400` — `"Missing required query parameter 'from' (e.g. ?from=<stepId>)"`
- `500` — `"Unknown step: <stepId>"`

**Response:** DeployReport (same shape as `POST /api/deploy`)

---

### `GET /api/deploy/runs`

List runs reconstructed from the activity log, newest first.

**Query:** `?limit=N` (default 50, min 1, max 500)

**Error:** `400` — `"Query parameter 'limit' must be an integer"`

**Response:**
```typescript
{
  runs: Array<{
    runId: string;
    trigger: 'full' | 'step' | 'resume' | 'dry-run';
    startedAt: string;   // ISO 8601
    finishedAt: string;  // ISO 8601
    status: 'success' | 'partial' | 'failed' | 'dry-run' | 'in-progress';
    stepCount: number;
  }>;
}
```

Legacy v1 runs (no `runId` in log) appear with synthetic IDs in the form `"legacy-<timestamp-ms>"`.

---

### `GET /api/deploy/runs/:runId`

Fetch one run's summary and all its activity entries.

**Path param:** `runId` — run UUID or legacy synthetic ID

**Error:** `404` — `"Unknown run: <runId>"`

**Response:**
```typescript
{
  run: RunSummary;            // same shape as runs[] element above
  entries: ActivityLogEntry[];
}
```

---

## Provider Sections

### `GET /api/providers/:id/sections`

Detail sections for a provider's expandable card. Called lazily when the Deploy screen expands a provider card.

**Path param:** `id` — plugin id (e.g. `"supabase"`, `"vercel"`)

**Error:** `404` — `"Unknown provider: <id>"`

**Response:**
```typescript
{ sections: DetailSection[] }
```

**DetailSection union** — discriminated by `kind`:

| `kind` | Required fields | Rendered as |
|--------|----------------|-------------|
| `kv` | `title`, `items: [{ label, value: string\|null }]` | `<dl>` key-value list |
| `metric-grid` | `title`, `metrics: [{ label, value, status?: DotStatus }]` | Grid of metric boxes |
| `list` | `title`, `items: [{ label, meta?: string, status?: DotStatus }]` | `<ul>` with optional StatusDot |
| `progress` | `title`, `current`, `total`, `meta?: string` | ProgressBar + fraction |
| `table` | `title`, `columns: string[]`, `rows: string[][]` | `<table>` |
| `custom-module` | `title`, `modulePath: string` | Dynamic-import + mount default export |

`DotStatus`: `'healthy' | 'warning' | 'error' | 'unknown'`

For `custom-module`: `modulePath` is dynamically imported by the frontend; the module must default-export a Preact component that accepts no required props.

---

## Provider-Specific Routes

These routes are registered by each plugin via `registerRoutes()`. They use the plugin's API prefix by convention.

### Supabase — prefix `/api/database`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/database/health` | Connection status, projectRef, region, version |
| GET | `/api/database/migrations` | Applied/total count + migration filename list |
| POST | `/api/database/migrations/push` | Push pending migrations |
| GET | `/api/database/functions` | Edge function deployment status |
| POST | `/api/database/functions/deploy` | Deploy by name (body `{ name }`) or all |
| POST | `/api/database/functions/:name/deploy` | Deploy one function by name |
| POST | `/api/database/functions/deploy-all` | Deploy all functions |
| GET | `/api/database/extensions` | pgvector extension status |
| POST | `/api/database/extensions/:name/enable` | Enable an extension (maps `pgvector` → `vector`) |

### Vercel — prefix `/api/frontend`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/frontend/project` | Project name, framework, productionUrl, dashboardUrl |
| GET | `/api/frontend/deployments` | Current production deployment + history |
| POST | `/api/frontend/redeploy` | Trigger redeploy of current production deployment |
| POST | `/api/frontend/promote/:uid` | Promote a deployment UID to production |
| GET | `/api/frontend/env` | Env vars with vault comparison (`match/mismatch/missing/unknown`) |
| POST | `/api/frontend/env/sync` | Sync all secrets via `syncEngine.syncAll()` |

### Resend — prefix `/api/email`

Responses are cached 30s (rate-limit-safe for Resend's 2 req/s limit).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/email/domain` | First configured domain (404 if none) |
| POST | `/api/email/domain/verify` | Trigger domain verification (body `{ id? }`) |
| GET | `/api/email/dns` | DNS records for the first domain |
| GET | `/api/email/stats` | Sending stats (sent, limit, remaining) |
| GET | `/api/email/keys` | API key list |

### GitHub — prefix `/api/cicd`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cicd/health` | GitHub API connectivity status |
| GET | `/api/cicd/repo` | Repo name, branch, URL |
| GET | `/api/cicd/workflows` | Workflow files with last-run status |
| GET | `/api/cicd/runs` | Recent workflow runs |
| GET | `/api/cicd/secrets` | Repository secrets vs expected list |
| POST | `/api/cicd/secrets/sync` | Push all vault secrets to GitHub repo secrets |
| POST | `/api/cicd/workflows/create-keepalive` | Create `supabase-keepalive.yml` workflow file |

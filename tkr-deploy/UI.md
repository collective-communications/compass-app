# tkr-deploy — Frontend Architecture

## 1. Stack

| Concern | Choice |
|---------|--------|
| Framework | Preact 10 |
| State | @preact/signals 2 |
| Build tool | Vite (output to `ui/dist/`, rebuilt on every server boot) |
| Styles | Single `styles.css` file (no CSS framework) |
| Entry point | `ui/src/app.tsx` → `ui/index.html` |
| Module format | ESM throughout |

The server serves `ui/dist/` as static files with SPA fallback to `index.html`.

---

## 2. Shell Layout

```
<div class="shell">
  <Topbar />                    ← fixed 48px top bar, full width
  <div class="shell-body">
    <RunRail />                 ← desktop only (≥768px), 220px left sidebar
    <main id="main-content"     ← scrollable page content area
          class="shell-content">
      {Screen}
    </main>
  </div>
  <MobileTabBar />              ← mobile only (<768px), fixed bottom 60px
</div>
```

**Topbar** (`shell/Topbar.tsx`): wordmark / project / section breadcrumb on left; VaultStatus dot + ⌘K hint + theme toggle on right.

**RunRail** (`shell/RunRail.tsx`): 6 nav pills (Runs, Secrets, Database, Frontend, Email, Workflows) + last-5 run pills fetched from `/api/deploy/runs?limit=5`. Refreshes on every `run:start` SSE event.

**MobileTabBar** (`shell/MobileTabBar.tsx`): same 6 nav items as RunRail using icon + label format.

**Breakpoint:** 768px — RunRail hidden and MobileTabBar shown below this threshold.
Implemented via `useIsMobile()` from `ui/src/hooks/useMediaQuery.ts`.

---

## 3. Router

Module: `ui/src/router.ts`

**Signal:** `currentPath$: Signal<string>` — shell components read this to derive active state.

**Functions:**
| Function | Description |
|----------|-------------|
| `navigate(path)` | Push into history + update signal. No-op on same path. |
| `replace(path)` | Replace current history entry (e.g. redirect on 404). |
| `initRouter(routes, fallback?)` | Seed `currentPath$` from `window.location.pathname`; register `popstate` listener. Unknown paths redirect to fallback (default: `'/'`). Call once at boot. |
| `resolveRoute(path)` | Return the component for `path`, falling back to the fallback component. |

All routes are **exact-match strings** — no dynamic path segments in the current route table.

**Current routes** (defined in `app.tsx`):
| Path | Screen |
|------|--------|
| `/` | `DeployScreen` |
| `/secrets` | `SecretsScreen` |
| `/database` | `DatabaseScreen` |
| `/frontend` | `FrontendScreen` |
| `/email` | `EmailScreen` |
| `/cicd` | `CicdScreen` |

**Adding a screen:**
1. Create `ui/src/screens/your-screen.tsx` with a named component export
2. Add `{ path: '/your-path', component: YourScreen }` to `routes[]` in `app.tsx`
3. Add a nav item to `RAIL_NAV` in `shell/RunRail.tsx`
4. Add the matching entry to `shell/MobileTabBar.tsx`

---

## 4. Stores

All stores use `@preact/signals`. Import directly from the store module.

### `vault$` — `ui/src/stores/vault.ts`

```typescript
interface VaultState {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  label: string;   // e.g. "unlocked", "locked", "unreachable"
}

export const vault$: Signal<VaultState>;
export function startVaultPolling(): void;   // idempotent
export function stopVaultPolling(): void;
```

Source: polls `GET /api/health` every 30s. Starts in `{ status: 'unknown', label: 'checking...' }`. Exported `startVaultPolling()` is called at app boot; idempotent if called twice.

---

### `deployState$` — `ui/src/stores/deploy.ts`

```typescript
interface DeployStepState {
  stepId: string;
  label: string;
  provider: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'dry-run';
  startedAt?: string;
  durationMs?: number;
  detail?: string;
  error?: string;
}

interface CurrentRun {
  runId: string;
  trigger: 'full' | 'step' | 'resume' | 'dry-run';
  startedAt: string;
  finishedAt?: string;
  frozen: boolean;   // true once run:complete or run:dry-run received
  steps: DeployStepState[];
}

interface DeployState {
  currentRun: CurrentRun | null;
  streamConnected: boolean;
}

export const deployState$: Signal<DeployState>;
export function startDeployStream(): void;   // idempotent
export function stopDeployStream(): void;
```

Source: SSE stream at `GET /api/events`. Steps are accumulated via upsert (matched by `stepId`). The run stays as `currentRun` after completion (`frozen: true`) until the next `run:start` event replaces it.

---

### `manifest$` — `ui/src/stores/manifest.ts`

```typescript
export const manifest$: Signal<ManifestResponse | null>;
export function loadManifest(): Promise<void>;   // idempotent; one-shot fetch
```

Source: one-shot `GET /api/manifest` at app boot. Falls back to `{ name: 'tkr-deploy', screens: [] }` on error so the shell can still render.

---

### `syncState$` — `ui/src/stores/sync.ts`

```typescript
interface SyncState {
  data: SyncSecretsResponse | null;
  loading: boolean;
  error: string | null;
  loadedAt: number | null;   // Unix ms
}

export const syncState$: Signal<SyncState>;
export function loadSync(): Promise<void>;   // fetches or refreshes /api/secrets
```

Source: lazy — not fetched until `loadSync()` is called (triggered by `SecretsScreen` on mount). Call `loadSync()` again to refresh after a sync action.

`SyncSecretsResponse` mirrors the `GET /api/secrets` response shape — see [API.md](API.md).

---

### `theme$` — `ui/src/stores/theme.ts`

```typescript
export type Theme = 'light' | 'dark';
export const theme$: Signal<Theme>;
export function initTheme(): void;    // call once at boot
export function toggleTheme(): void;  // persists to localStorage
```

Storage key: `'tkr-theme'` (shared with tkr-secrets for cross-tool preference persistence).

Resolution order at init:
1. Explicit override from `localStorage['tkr-theme']`
2. System preference via `prefers-color-scheme`

A live media-query listener keeps the signal in sync with the OS preference until the user manually toggles.

---

## 5. Component Inventory

All components are in `ui/src/components/`. Named exports only.

| Component | Key Props | Notes |
|-----------|-----------|-------|
| `Button` | `variant?: 'primary'\|'secondary'\|'ghost'`, `disabled?`, `onClick?` | Shows spinner while async `onClick` resolves |
| `Card` | `children`, `severity?: 'healthy'\|'warning'\|'error'` | Universal container; severity adds colored left border |
| `StatusDot` | `status: DotStatus` | Colored circle indicator |
| `RunPill` | `status`, `trigger`, `startedAt` | Status label with semantic color + dot |
| `FacetChip` | `provider`, `status`, `summary?` | Per-provider status chip with icon glyph |
| `Annotation` | `children`, `size?: 'sm'\|'md'\|'lg'` | Caveat-font ink annotation; cyan accent |
| `ProgressBar` | `value: number`, `max: number` | Accessible `role="progressbar"` with fill |
| `Sparkline` | `data: number[]` | Inline SVG bar chart; height encodes magnitude |
| `CopyButton` | `text: string` | Copies to clipboard on click |
| `Skeleton` | `width?`, `height?` | CSS-animated loading placeholder |

`DotStatus`: `'healthy' | 'warning' | 'error' | 'unknown'`

---

## 6. SectionRenderer Protocol

Module: `ui/src/sections/SectionRenderer.tsx`

```typescript
interface SectionRendererProps {
  sections: DetailSection[];
}

export function SectionRenderer(props: SectionRendererProps): JSX.Element;
```

Renders a `DetailSection[]` payload from `GET /api/providers/:id/sections`. Switches on `section.kind` — each variant is a self-contained card using the `Card` component.

| `kind` | Rendered as |
|--------|-------------|
| `kv` | `<dl>` key-value pairs; `null` values render as `—` |
| `metric-grid` | Grid of metric boxes with optional `StatusDot` per metric |
| `list` | `<ul>` with optional `StatusDot` + meta text per item |
| `progress` | `ProgressBar` with `current / total` fraction + optional meta label |
| `table` | `<table>` with `<thead>` + `<tbody>` |
| `custom-module` | Dynamic import of `section.modulePath`; mounts `default` export as a Preact component |

**`custom-module` behavior:**
- The `modulePath` is passed directly to `import()` (using `@vite-ignore` to suppress Vite's static analysis warning)
- The module must default-export a Preact component accepting no required props
- Shows `"Loading module…"` while the import is pending
- Shows an inline error message if the import fails or has no default export
- Component is mounted with `<state.Component />` (no props)

---

## 7. API Client

Module: `ui/src/api.ts`

### `apiFetch<T>(path, options?)`

JSON fetch with automatic `{ success, data }` envelope unwrap.

```typescript
interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
}

async function apiFetch<T>(path: string, options?: ApiFetchOptions): Promise<T>;
```

- Throws `ApiError` on non-2xx responses
- Returns `undefined as T` on 204 No Content
- Unwraps `{ success: true, data: T }` envelope if present; otherwise returns JSON as-is

```typescript
class ApiError extends Error {
  readonly status: number;
  readonly body: string;
}
```

### `createEventSource(path, handlers)`

Typed SSE client. Wires per-event-kind handlers using named `addEventListener` calls (not the default `message` event).

```typescript
type SseHandlers = Partial<Record<SseEventKind, (data: unknown) => void>>;
function createEventSource(path: string, handlers: SseHandlers): EventSource;
```

Callers are responsible for calling `.close()` on the returned `EventSource` during teardown. `deployState$` manages the shared connection; most components should not call this directly.

**No base URL prefix** — all paths are relative to the server origin.

---

## 8. Types

Module: `ui/src/types.ts`

This file mirrors the authoritative backend types for frontend consumption. It contains no runtime code — only type definitions.

**Rule:** When backend types change (in `src/types/` or `src/core/event-bus.ts`), update this file in the same commit.

Types defined here:
- `DotStatus`, `ProviderStatus`
- `ManifestScreen`, `ManifestResponse`
- `HealthResponse`, `ProviderInfo`
- `DetailSection`, `DetailSectionKind`
- `RunSummary`, `ActivityLogEntry`
- `DeployTrigger`, `DeployRunStatus`, `DeployEvent`, `DeployEventKind`, `SseEventKind`

The `SyncSecretsResponse` and `SyncState` types are defined in `stores/sync.ts` since they're only used there.

---

## 9. Boot Sequence

Called in `bootstrap()` in `app.tsx`:

```typescript
initTheme();                    // resolve + apply theme before first render
initRouter(routes, '/');        // seed currentPath$ from window.location
void loadManifest();            // one-shot fetch of /api/manifest
startVaultPolling();            // start 30s vault status poll
startDeployStream();            // open SSE connection to /api/events
render(<App />, root);          // mount Preact tree
```

`bootstrap()` is called on `DOMContentLoaded` (or immediately if already loaded).

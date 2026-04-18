# ADR-003: Lazy Supabase Client via `Proxy`

Date: 2026-04-16
Status: Accepted

## Context

`apps/web/src/lib/supabase.ts` exports a single `supabase` client consumed
throughout the app (auth store, feature hooks, edge-function callers). The
client requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at
construction time.

Eagerly calling `createClient()` at module load has two problems:

1. In local dev, Storybook, and Playwright visual runs, env vars may be absent.
   A module-level throw aborts the bundle before any component mounts, so the
   app cannot render a diagnostic screen or degrade gracefully.
2. Test harnesses and wireframe stubs import feature code that transitively
   imports `supabase`. An eager client forces every unrelated test to stub
   env vars or mock the module.

We want the app to boot whenever possible, and only error at the moment a
caller actually reaches for a client method.

## Decision

Export `supabase` as an ES `Proxy` over an empty object. The first property
access triggers `createClient<Database>()` with cached singleton semantics.
Missing env vars throw a descriptive error pointing at `.env.local` — but
only on first real use, not at import time.

```ts
export const supabase: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  { get: (_t, prop, r) => Reflect.get(ensureClient(), prop, r) },
);
```

## Consequences

**Positive:**
- App renders without env vars; unauth routes (landing, login) work.
- Tests that never touch Supabase need no env setup.
- Singleton caching preserved — the `Proxy` resolves to the same client every
  call.

**Negative:**
- Errors surface at the first query, not at startup — mitigated by the
  `VITE_*` vars being required at build time in CI.
- `Proxy` adds a small per-call indirection; negligible at this query volume.

## Alternatives considered

- **Eager `createClient` with startup guard.** Blocks boot in any env-less
  context (Storybook, visual tests).
- **Factory `getSupabase()` everywhere.** Touches every call site and breaks
  the ergonomic `supabase.from('x')` pattern.

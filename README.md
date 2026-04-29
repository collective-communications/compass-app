# Collective Culture Compass

Culture assessment platform for **COLLECTIVE culture + communication** (CC+C).

Digitizes CC+C's proprietary Collective Culture Compass framework: survey administration, interactive compass visualization, and branded diagnostic reporting.

## Stack

- **Runtime:** Bun (package manager + test runner)
- **Frontend:** React 19 + Vite 6
- **Routing + Data:** TanStack Router + React Query
- **Client State:** Zustand
- **Backend:** Supabase (auth, database, edge functions, storage)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **E2E Tests:** Playwright
- **Component Dev:** Storybook

## Monorepo Structure

```
apps/web          — Main web application
apps/storybook    — Component library
packages/types    — Shared TypeScript types
packages/scoring  — Scoring algorithm pipeline
packages/compass  — SVG compass visualization
packages/tokens   — Design tokens
packages/utils    — Shared utilities
packages/ui       — UI component library
e2e/              — End-to-end tests (Playwright)
supabase/         — Migrations, edge functions, config
```

## Commands

```bash
bun run dev       # Start dev server
bun run build     # Production build
bun run test      # Run tests
bun run typecheck # Type-check all packages
bun run lint      # Lint all packages
bun run storybook # Launch Storybook
```

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) and are enforced by a `commit-msg` hook running [commitlint](https://commitlint.js.org/).

- **Scope is required.** `feat(survey): add likert-5 support` — not `feat: add likert-5 support`.
- **Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `build`, `ci`, `style`, `revert`.
- Config: [`commitlint.config.js`](./commitlint.config.js).

The hook is installed into `.git/hooks/commit-msg` automatically by `bun install` via [`scripts/install-hooks.sh`](./scripts/install-hooks.sh), which copies every file in [`scripts/hooks/`](./scripts/hooks/). No Husky required. To re-install manually, run `bun install` or `bash scripts/install-hooks.sh`.

## Documentation

Project documentation lives in `_docs/`. The `.context-kit/_ref/` directory contains the distilled reference YAMLs — start with `_index.yaml` for routing to any topic.

Privacy-sensitive implementation notes:

- Cookie-free analytics contract: [`_docs/privacy/analytics.md`](_docs/privacy/analytics.md)
- Analytics dashboard specs: [`_docs/analytics-dashboard/SPEC.md`](_docs/analytics-dashboard/SPEC.md)
- Analytics ADR: [`_adrs/adr-007-cookie-free-analytics.md`](_adrs/adr-007-cookie-free-analytics.md)

## License

Proprietary. All rights reserved by COLLECTIVE culture + communication.

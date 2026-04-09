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
apps/storybook    — Component library + visual tests
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
bun install       # Install dependencies
bun run dev       # Start dev server
bun run build     # Production build
bun run test      # Run tests
bun run typecheck # Type-check all packages
bun run lint      # Lint all packages
bun run storybook # Launch Storybook
```

## Documentation

Project documentation lives in `_docs/`. The `.context-kit/_ref/` directory contains the distilled reference YAMLs — start with `_index.yaml` for routing to any topic.

## License

Proprietary. All rights reserved by COLLECTIVE culture + communication.

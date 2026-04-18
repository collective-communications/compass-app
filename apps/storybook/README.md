# `@compass/storybook`

Storybook workspace for visual development and component testing of shared UI across the monorepo.

## Commands

```bash
bun run storybook        # Launch Storybook dev server
bun run build-storybook  # Static build (used by CI deploy to Cloudflare Pages)
bun run test-storybook   # Story interaction tests via @storybook/test-runner
bun run test:visual      # Playwright visual-regression tests
```

## Public surface

- `templates/` — Reusable story templates (shells, scaffolds).
- `test-utils/` — Helpers shared by story tests and visual specs.
- `visual-tests/` — Playwright specs for cross-browser visual regression.

## Key dependencies

`@storybook/react-vite`, `@storybook/test-runner`, `@playwright/test`, and the workspace packages (`@compass/compass`, `@compass/scoring`, `@compass/tokens`, `@compass/types`, `@compass/ui`, `@compass/utils`).

# `@compass/storybook`

Storybook workspace for component development and testing of shared UI across the monorepo.

## Commands

```bash
bun run storybook        # Launch Storybook dev server
bun run build-storybook  # Static build (used by CI deploy to Cloudflare Pages)
bun run test-storybook   # Story interaction tests via @storybook/test-runner
```

## Public surface

- `templates/` — Reusable story templates (shells, scaffolds).
- `test-utils/` — Helpers shared by story tests.

## Key dependencies

`@storybook/react-vite`, `@storybook/test-runner`, and the workspace packages (`@compass/compass`, `@compass/scoring`, `@compass/tokens`, `@compass/types`, `@compass/ui`, `@compass/utils`).

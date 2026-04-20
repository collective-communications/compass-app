# ADR-007: Visual regression baselines are generated in CI only

Date: 2026-04-20
Status: Accepted

## Context

`apps/storybook/test:visual` runs Playwright with `toHaveScreenshot`, which
diffs rendered PNGs against committed baselines under
`apps/storybook/__snapshots__/`. The `visual-regression` job in
`.github/workflows/ci.yml` fails in CI whenever a baseline is missing — tests
cannot auto-create baselines in CI without `--update-snapshots`, and passing
that flag in CI would mask regressions.

Baselines are pixel-sensitive to the rendering platform. A PNG generated on
macOS font-rendering and color pipelines drifts against the Linux container
that GitHub Actions uses, so a developer running `test:visual:update`
locally cannot produce baselines that CI will accept. The project also
forbids Docker for local dev (see project memory), removing the most obvious
workaround.

## Decision

Visual baselines are regenerated exclusively by a dedicated GitHub Actions
workflow, `.github/workflows/update-visual-baselines.yml`, triggered on
`workflow_dispatch`. The workflow runs on `ubuntu-latest`, reuses the exact
Bun and Playwright setup from `ci.yml:visual-regression` (including
`working-directory: apps/storybook` for Playwright install), executes
`playwright test --update-snapshots`, and commits the resulting PNGs back to
the branch the workflow was dispatched on.

Developers never run `test:visual:update` locally for committed baselines.
Local runs remain useful for iterating on story layout — but the PNGs they
produce are scratch output, not artifacts.

## Consequences

**Positive:**
- Baselines are deterministic with the CI runtime that validates them.
- No Docker dependency on developer machines.
- `ci.yml:visual-regression` stays pure — no write access, no self-commit
  logic, no branching for "first run" vs. "regression check".
- One-button refresh: after intentional visual changes, dispatch the
  workflow on the PR branch via `gh workflow run
  update-visual-baselines.yml`.

**Negative:**
- Round-trip latency on visual changes — an extra CI run before the diff
  becomes reviewable.
- The workflow needs `contents: write` and the default `GITHUB_TOKEN` to
  push commits; branch protection on `main` must permit
  `github-actions[bot]` commits or the dispatch must target a feature
  branch.

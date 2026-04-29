# Scoring Validation

Standalone Cloudflare Pages target for the Culture Compass scoring validator.

## Local Development

```bash
bun run validation:dev
```

The app defaults to port `42334`, or `VALIDATION_PORT` / `PORT` when those env vars are set.

## Build

```bash
bun run validation:build
```

The static output is written to `apps/validation/dist`.

## Deploy

```bash
bun run deploy-validation
```

By default this deploys to the Cloudflare Pages project `compass-calculations`, currently hosted at `compass-calculations.pages.dev`.
Set `VALIDATION_PAGES_PROJECT` and `VALIDATION_PAGES_DOMAIN` to use a different Pages project.

## Access

```bash
bun run setup-validation-access
```

This protects the validation Pages hostname with the same Microsoft 365 Cloudflare Access flow used by `ccc-docs` and Storybook. The deployed Pages middleware only serves `compass-calculations.pages.dev`; deployment aliases and branch preview URLs return 404.

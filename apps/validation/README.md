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

By default this deploys to the Cloudflare Pages project `validation`, producing `validation.pages.dev`.
Set `VALIDATION_PAGES_PROJECT` to use a different Pages project name.

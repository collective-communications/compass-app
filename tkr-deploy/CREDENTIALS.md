# tkr-deploy — Required Credentials

All secrets are stored in the `compass` vault via tkr-secrets (localhost:42042).

---

## Supabase

### SUPABASE_ACCESS_TOKEN
Personal access token for the Supabase Management API (migrations, edge functions, extensions).

1. Go to https://supabase.com/dashboard/account/tokens
2. Click **Generate new token**
3. Name it `tkr-deploy` and copy the token

### DEV_APP_URL (optional)
Local dev base URL (e.g. `http://localhost:42333`) whitelisted alongside `APP_URL`
in Supabase's auth redirect allow-list by the `configureAuth` deploy step. Only
needed if you want password-recovery / OAuth callback links to return to a local
dev server (required to un-skip `apps/e2e/tests/auth/password-reset.spec.ts`).
Skipped automatically when unset or when it equals `APP_URL`.

---

## Vercel

### VERCEL_TOKEN
API token for deployments, env vars, and project status.

1. Go to https://vercel.com/account/tokens
2. Click **Create** → name it `tkr-deploy`, set scope to your team
3. Copy the token

### VERCEL_PROJECT_ID
The project ID for the Compass app deployment.

1. Go to https://vercel.com/ → select the project
2. Go to **Settings** → **General**
3. Copy the **Project ID**

### VERCEL_ORG_ID
Your Vercel team/org ID (optional for personal accounts).

1. Go to https://vercel.com/account
2. Or: **Team Settings** → **General**
3. Copy the **Team ID**

---

## Resend

### RESEND_API_KEY
API key for domain verification, sending stats, and DNS records.

1. Go to https://resend.com/api-keys
2. Click **Create API Key** → name it `tkr-deploy`, permission: **Full Access**
3. Copy the key (starts with `re_`)

---

## GitHub

### GITHUB_TOKEN
Uses GitHub Device Flow authentication — no manual token creation needed.

1. Go to https://github.com/settings/developers
2. Under **OAuth Apps**, click **New OAuth App**
3. Set:
   - Application name: `tkr-deploy`
   - Homepage URL: `http://localhost:42043`
   - Authorization callback URL: `http://localhost:42043/auth/callback`
4. Copy the **Client ID** — this is used for device flow auth
5. The device flow will prompt you to visit https://github.com/login/device and enter a code at runtime — no long-lived token stored

> **Note:** Device flow support requires updating the GitHub adapter to use OAuth device flow instead of a PAT. Set `GITHUB_CLIENT_ID` in the vault and the adapter will handle the rest.

---

## Environment Variables (non-secret)

Set these when starting the server:

```bash
GITHUB_OWNER=your-github-org GITHUB_REPO=compass-app bun run tkr-deploy/serve.ts
```

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_OWNER` | GitHub org or username | `collectivecommunication` |
| `GITHUB_REPO` | Repository name | `compass-app` |
| `DEPLOY_PORT` | Server port (default: 42043) | `42043` |
| `VAULT_URL` | tkr-secrets URL (default: http://localhost:42042) | — |
| `VAULT_NAME` | Vault name (default: compass) | — |

---

## Quick Setup

Add all secrets to the vault via tkr-secrets UI at http://localhost:42042, then restart tkr-deploy.

Required for each screen:

| Screen | Secrets Needed |
|--------|---------------|
| Deploy | All (aggregated health + provider status) |
| Secrets | Vault connected (already working) |
| History | None (reads local deploy log) |

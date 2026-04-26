# @compass/sdk

Headless TypeScript SDK for the Culture Compass backend.

Wraps the Supabase tables, RPCs, edge functions, and storage that the web app
talks to, so any caller (web app, scripts, edge functions, future CLI, tests)
can drive the platform end-to-end without React or browser globals.

## Usage

```ts
import { createClient } from '@supabase/supabase-js';
import { configureSdk, listSurveys, createReport } from '@compass/sdk';
import type { Database } from '@compass/types';

const client = createClient<Database>(URL, KEY);
configureSdk({ client });

const surveys = await listSurveys(orgId);
```

For a respondent flow, supply a `surveySessionClient` factory so the SDK can
build a per-request client that sends `x-session-token` (required by the
anon RLS policies on `responses` and `answers`):

```ts
import { createClient } from '@supabase/supabase-js';

configureSdk({
  client,
  surveySessionClient: (sessionToken) =>
    createClient<Database>(URL, KEY, {
      global: { headers: { 'x-session-token': sessionToken } },
      auth: { persistSession: false, autoRefreshToken: false },
    }),
});
```

## Surface

- `admin/` — surveys, deployments, recipients, clients (organizations), users
- `survey/` — respondent engine (resolve deployment, save/resume response, upsert answers, submit)
- `reports/` — report CRUD and payload assembly

## Logging

Pass a `Logger` (any object with `info` / `warn` / `error` / `debug`) to
`configureSdk`. Defaults to a no-op logger so headless callers don't pollute
stdout unless they opt in.

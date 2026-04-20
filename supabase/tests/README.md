# pgTAP RLS Test Suite

This directory contains pgTAP tests that verify the "structural anonymity" guarantee and row-level security policies of the Culture Compass database.

## What is pgTAP?

[pgTAP](https://pgtap.org/) is a unit-testing framework for PostgreSQL. Tests are written as plain SQL files that invoke assertion functions (`ok()`, `is()`, `results_eq()`, `throws_ok()`, `lives_ok()`, etc.) wrapped in `plan(N)` / `finish()` scaffolding. Each test file runs inside a transaction that is rolled back at the end, so tests leave no persistent state behind.

## What these tests cover

| File | Purpose |
| --- | --- |
| `../tests_helpers/fixtures.sql` | Not a test — `\ir`-included at the top of every test file. Installs the `pgtap` extension (idempotent) and registers shared helper functions (`create_test_org`, `create_test_user`, `create_test_survey`, `create_test_deployment`, `create_test_question`, plus `set_auth_uid` / `set_anon_claim` / `set_session_token_header` / `clear_auth` for role-switch convenience). Lives in the sibling `supabase/tests_helpers/` directory because Supabase CLI recurses `supabase/tests/**/*.sql` — a nested `helpers/` would be executed as a test and fail with "No plan found". |
| `rls_anon_responses.sql` | Anonymous caller can INSERT a response for a valid deployment, cannot SELECT another session's response (verifies migration `039` session-token binding), cannot SELECT responses for an inactive deployment. |
| `rls_anon_answers.sql` | Parallel coverage for the `answers` table. |
| `rls_authenticated_cross_org.sql` | A signed-in user in org A cannot read any data (responses, answers, surveys, deployments) belonging to org B. |
| `safe_segment_scores_threshold.sql` | The `safe_segment_scores` view masks segments with fewer than `anonymityThreshold` (default 5) responses and surfaces segments at or above the threshold. |
| `reorder_questions_ownership.sql` | The `reorder_questions` RPC rejects cross-org callers with SQLSTATE `42501` (verifies migration `039` ownership guard). |

## Running locally

The Supabase CLI runs pgTAP tests against a local Postgres container started by `supabase start`:

```bash
# one-time — start the local stack (requires Docker)
supabase start

# run all tests in this directory
supabase test db --local

# run a single file
supabase test db --local supabase/tests/rls_anon_responses.sql
```

> **Note:** this project's local development does not use Docker — the app connects directly to Supabase Cloud. To execute these tests you must either
> 1. start the local stack explicitly (`supabase start`, which does bring up a Docker container for Postgres + pgTAP), or
> 2. point at a disposable database via `--db-url <connection-string>`.
>
> The cloud project cannot be used as a test target: tests include role switches (`SET LOCAL ROLE anon`) and schema assumptions that only hold on a freshly-migrated database.

## CI integration

In CI, the Supabase Action (`supabase/setup-cli@v1`) bootstraps the CLI, then `supabase db start && supabase test db --local` runs the suite. Failures are surfaced via pgTAP's TAP output, which the Action parses into step annotations. No additional test runner is required.

## Writing new tests

Every test file follows the same shape:

```sql
BEGIN;
\ir ../tests_helpers/fixtures.sql
SELECT plan(<number_of_assertions>);

-- seed fixtures
SELECT tests.create_test_org('org-a') AS org_id \gset

-- ... assertions ...

SELECT * FROM finish();
ROLLBACK;
```

Use the helpers in `../tests_helpers/fixtures.sql` rather than hand-rolling INSERTs so new tests automatically pick up any schema additions.

# pgTAP RLS Test Suite

This directory contains pgTAP tests that verify the "structural anonymity" guarantee and row-level security policies of the Culture Compass database.

## What is pgTAP?

[pgTAP](https://pgtap.org/) is a unit-testing framework for PostgreSQL. Tests are written as plain SQL files that invoke assertion functions (`ok()`, `is()`, `results_eq()`, `throws_ok()`, `lives_ok()`, etc.) wrapped in `plan(N)` / `finish()` scaffolding. Each test file runs inside a transaction that is rolled back at the end, so tests leave no persistent state behind.

## What these tests cover

| File | Purpose |
| --- | --- |
| `helpers/fixtures.sql` | Not a standalone test — `\ir`-included at the top of every test file. Installs the `pgtap` extension (idempotent) and registers shared helper functions (`create_test_org`, `create_test_user`, `create_test_survey`, `create_test_deployment`, `create_test_question`, plus `set_auth_uid` / `set_anon_claim` / `set_session_token_header` / `clear_auth` for role-switch convenience). Supabase CLI recurses `supabase/tests/**/*.sql`, so pg_prove also runs this file directly — the tail of the file emits an empty pgTAP plan behind the `TAP_HELPERS_INCLUDED` psql variable so a standalone run reports zero tests instead of failing the suite with "No plan found". |
| `rls_anon_responses.sql` | Anonymous caller can INSERT a response for a valid deployment, cannot SELECT another session's response (verifies migration `039` session-token binding), cannot SELECT responses for an inactive deployment. |
| `rls_anon_answers.sql` | Parallel coverage for the `answers` table. |
| `rls_authenticated_cross_org.sql` | A signed-in user in org A cannot read any data (responses, answers, surveys, deployments) belonging to org B. |
| `safe_segment_scores_threshold.sql` | The `safe_segment_scores` view masks segments with fewer than `anonymityThreshold` (default 5) responses and surfaces segments at or above the threshold. |
| `reorder_questions_ownership.sql` | The `reorder_questions` RPC rejects cross-org callers with SQLSTATE `42501` (verifies migration `039` ownership guard). |
| `security_authz_boundaries.sql` | CCC members cannot mutate authorization state, including org memberships or profile roles. |
| `security_result_access.sql` | Result views and result RPCs enforce org membership, role, and client access toggles at the database boundary. |
| `security_anon_survey_boundary.sql` | Anonymous survey access is token-bound and active deployments, surveys, and questions are not enumerable. |
| `security_answer_write_session.sql` | Anonymous answer writes require the matching respondent session token. |
| `security_answer_question_survey_ownership.sql` | Answer writes are rejected when the question belongs to a different survey than the response deployment. |
| `security_survey_threshold_resolution.sql` | Anonymity thresholds resolve from `surveys.settings.anonymityThreshold` before falling back to org/platform defaults. |
| `security_segment_question_scores_masking.sql` | The segment-question RPC nulls low-n metrics and distributions when a segment is masked. |
| `security_response_metrics_threshold.sql` | The response metrics RPC redacts low-n department and daily buckets while preserving aggregate totals. |
| `security_reports_storage_visibility.sql` | Report storage object reads mirror report row visibility, status, and client access settings. |
| `security_logo_storage.sql` | Logo storage writes and deletes are constrained to the caller's organization path and allowed object types. |
| `security_cookie_free_analytics.sql` | Cookie-free analytics writes aggregate counters only, rejects forbidden fields, denies direct table reads, and exposes summaries only through the CC+C read RPC. |

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

From the repository root, the database security suite is also exposed as:

```bash
bun run test:security:db
```

That command runs the same pgTAP suite through the Supabase CLI. Use
`bun run test:security` to combine security unit tests, database tests, and
direct security E2E probes.

> **Note:** this project's local development does not use Docker — the app connects directly to Supabase Cloud. To execute these tests you must either
> 1. start the local stack explicitly (`supabase start`, which does bring up a Docker container for Postgres + pgTAP), or
> 2. point at a disposable database via `--db-url <connection-string>`.
>
> The cloud project cannot be used as a test target: tests include role switches (`SET LOCAL ROLE anon`) and schema assumptions that only hold on a freshly-migrated database.

## CI integration

In CI, the Supabase Action (`supabase/setup-cli@v1`) bootstraps the CLI, then `supabase start`, `supabase db reset --local`, and `supabase test db --local` run the suite. Failures are surfaced via pgTAP's TAP output, which the Action parses into step annotations. No additional test runner is required.

## Writing new tests

Every test file follows the same shape:

```sql
BEGIN;
\set TAP_HELPERS_INCLUDED 1
\ir helpers/fixtures.sql
SELECT plan(<number_of_assertions>);

-- seed fixtures
SELECT tests.create_test_org('org-a') AS org_id \gset

-- ... assertions ...

SELECT * FROM finish();
ROLLBACK;
```

Use the helpers in `helpers/fixtures.sql` rather than hand-rolling INSERTs so new tests automatically pick up any schema additions.

# Cookie-Free Usage Analytics

Culture Compass uses first-party, aggregate analytics to understand product usage without creating visitor profiles.

## What We Collect

Analytics events are limited to the shared contract in `packages/types/src/analytics.ts`.

Allowed examples:

- Event name, such as `route_viewed` or `survey_completed`.
- Route template, such as `/s/$token` or `/results/$surveyId/compass`.
- Product surface, role, tier, organization ID, survey ID, deployment ID.
- Report format, results tab, survey resolution status, action status.
- Build environment and app version.

## What We Do Not Collect

The analytics system must not collect:

- Analytics cookies.
- LocalStorage or sessionStorage visitor IDs.
- Third-party analytics snippets or tracking pixels.
- Raw IP addresses, IP hashes, raw user agents, browser fingerprints, or device fingerprints.
- Auth `user_id`, user email, respondent email, invitation token, or respondent roster identity.
- Full URLs, query strings, hash fragments, survey tokens, deployment tokens, signed report URLs, or storage paths.
- Survey answer values, open-ended text, question text, or free-form search/filter text.

Functional survey cookies remain allowed for anonymous save-and-resume, but analytics code must never read, write, copy, hash, or transmit those values.

## Storage Model

V1 stores daily aggregate counters only. There is no raw analytics event table.

The aggregate write path is:

1. Browser emits a whitelisted event to the first-party `capture-analytics` Supabase Edge Function.
2. The function validates the event name, route template, payload keys, enum values, and forbidden fields.
3. The function calls `record_analytics_event`, which increments `analytics_daily_counts`.
4. CC+C users read summaries through `get_analytics_summary`.

Direct table reads are denied to authenticated users. The summary RPC is the reporting boundary.

## Reporting Threshold

Respondent-flow and client-specific breakdowns use the analytics contract's minimum reportable count of 5. Smaller groups remain hidden from summary views.

## Rollout Checklist

- Keep `ADR-007` accepted and current.
- Keep `packages/types/src/analytics.ts` and `supabase/functions/capture-analytics/contract.ts` in parity.
- Run the analytics unit tests and typecheck.
- Run pgTAP against a disposable Supabase database before deploying migrations.
- Confirm `vercel.json` keeps `connect-src` limited to self and Supabase.
- Do not add third-party analytics domains without a new ADR.

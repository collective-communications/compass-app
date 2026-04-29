# ADR-007: Cookie-Free Usage Analytics

**Date:** 2026-04-29
**Status:** Accepted
**Deciders:** Tucker
**Related:** [ADR-002](./adr-002-anonymous-survey-distribution.md), [ADR-006](./adr-006-ip-hash-strategy.md)

---

## Context

Culture Compass currently has no product analytics or usage telemetry. The app does have domain metrics, especially survey response counts and report generation state, but there is no consistent way to understand which surfaces are used, where respondents stop, or which administrative actions drive value.

The analytics design has to preserve the existing anonymity posture:

- Survey respondents use shared `/s/$token` links.
- The response model does not store `user_id`.
- `responses.ip_hash` is documented as dead weight and should not be populated.
- Existing survey cookies are functional save-and-resume state, scoped to `/s/`; they are not analytics identifiers.

Analytics must improve product understanding without introducing cross-site tracking, third-party scripts, fingerprinting, visitor profiles, raw IP collection, raw user-agent storage, or survey-token leakage.

## Decision

Implement analytics as a first-party, cookie-free aggregate system with two layers:

1. **Operational analytics from domain data.** Response counts, completion rates, duration, deployment status, report generation status, and similar facts remain derived from existing domain tables or aggregate rollups.
2. **Product usage events through a first-party endpoint.** The web app may emit only whitelisted, non-identifying events to a Supabase Edge Function. The endpoint validates the event name, route template, surface, and optional context, then writes daily aggregate counters.

For v1, **do not persist raw analytics event rows**. The ingestion function should increment daily aggregates directly. If a future debugging or attribution need requires raw events, that requires a new ADR and a retention-specific migration.

## Collection Rules

Allowed:

- Event name from the shared analytics taxonomy.
- Route template, never the current raw path.
- Surface, tier, and role.
- Organization, survey, and deployment IDs when needed for aggregate reporting.
- Report format, results tab, survey resolution status, and action status.
- Build environment and app version.

Forbidden:

- Analytics cookies.
- LocalStorage or sessionStorage visitor identifiers.
- Third-party analytics snippets or pixels.
- Raw IP address, IP hash, raw user agent, browser fingerprint, or device fingerprint.
- Auth `user_id`, user email, recipient email, respondent roster identity, or invitation token.
- Full URL, query string, hash fragment, survey token, deployment token, report signed URL, or storage path.
- Survey answer values, open-ended text, question text, or free-form search/filter text.

Functional survey cookies remain allowed for save-and-resume, but analytics code must never read, write, copy, hash, or transmit those values.

## Event Taxonomy

The canonical event names, route templates, surfaces, and allowed context keys live in `packages/types/src/analytics.ts`.

Initial event groups:

- Route views: `route_viewed`.
- Survey lifecycle: deployment resolution, edge-state display, start, resume, save, completion, open-text submit/skip without text.
- Admin survey actions: survey create, config save, publish, unpublish, link copy.
- Results usage: results tab view.
- Report actions: generation requested and download requested.
- Client/admin navigation: client selected.

The taxonomy intentionally avoids keystroke, scroll-depth, heatmap, and free-form input events.

## Aggregation Model

The Edge Function should bucket events by day and a small set of dimensions:

- `event_name`
- `route_template`
- `surface`
- `organization_id`
- `survey_id`
- `deployment_id`
- `tier`
- `role`
- `report_format`
- `results_tab`
- `survey_resolution_status`
- `action_status`
- `build_env`

Only dimensions that are meaningful for a given event should be populated. The reporting layer must apply a minimum reportable count before showing respondent-flow breakdowns or client-specific usage patterns.

## Consequences

What we gain:

- Product and operational usage insight without analytics cookies or third-party trackers.
- A clear contract that future instrumentation must use.
- Lower privacy risk because raw events are not retained.
- A route-template requirement that prevents survey tokens and signed URLs from entering analytics.

What we give up:

- No cross-session visitor funnels.
- No per-user analytics profiles.
- No exact path reconstruction.
- No raw-event replay for debugging.

These tradeoffs match the product need: understand adoption and friction while preserving trust.

## Verification Criteria

- Shared taxonomy exports compile from `@compass/types`.
- Tests prove forbidden analytics field names are detected across snake_case, camelCase, and nested payloads.
- Analytics route templates include placeholders such as `/s/$token` and never require raw URLs.
- The future Edge Function rejects unknown event names and any forbidden fields.
- The future database migration has no raw-event retention table unless this ADR is superseded.
- RLS/security tests prove only authorized roles can read aggregate analytics.

## Follow-Ups

- Build aggregate tables and read RPCs for Slice 2.
- Implement the first-party capture Edge Function for Slice 3.
- Instrument route/action capture in the web app for Slice 4.
- Add admin reporting surfaces for Slice 5.
- Update privacy docs and rollout gates for Slice 6.

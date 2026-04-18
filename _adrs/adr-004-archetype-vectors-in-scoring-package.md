# ADR-004: Archetype vectors live in `@compass/scoring`

Date: 2026-04-16
Status: Accepted (implementation pending — Wave 1.A)

## Context

The Culture Compass assigns each survey result to one of six archetypes
(Balanced, Clarity-Driven, Connection-Driven, Collaboration-Driven,
Core-Fragile, Disconnected) by Euclidean-nearest-neighbour match against a
set of target-score vectors.

Today `ARCHETYPE_VECTORS` is declared inline in
`apps/web/src/features/results/hooks/use-archetype.ts:15-64` and passed to
`identifyArchetype()` from `@compass/scoring`. The edge function
`supabase/functions/score-survey/index.ts` also needs to classify results
server-side, but currently hardcodes its own thresholds (`< 15`, `< 25`) and
does not have access to the same vector data.

This produces two risks:

1. **Drift.** If CC+C tunes the archetype profiles, two copies must be edited
   in sync. The UI and the stored scoring record can disagree.
2. **Testability.** Scoring package tests cover `identifyArchetype()` with
   synthetic vectors, but never exercise the production vectors — those live
   in a feature hook that Bun's test runner does not load.

`identifyArchetype(scores, vectors)` already takes vectors as an argument, so
no algorithm change is required — only relocation of the data.

## Decision

Extract `ARCHETYPE_VECTORS` into `packages/scoring/src/archetypes.ts` as a
named export of `@compass/scoring`. Both the UI feature hook and the edge
function import from this single source.

For the edge function (Deno, cannot resolve `@compass/*` workspace imports),
copy the file into `supabase/functions/_shared/scoring/archetypes.ts` as part
of the scoring-sync mechanism described in Wave 1.A of the plan. The
canonical definition remains in the scoring package; `_shared/` is a derived
mirror.

Expose the confidence thresholds (`CONFIDENCE_STRONG`, `CONFIDENCE_MODERATE`)
as exports from the same module so the edge function can replace its inline
`< 15 / < 25` literals.

## Consequences

**Positive:**
- Single source of truth for archetype definitions across UI and server.
- Scoring tests can import and validate the real production vectors.
- Tuning an archetype profile is a one-file edit (plus a `_shared/` sync).

**Negative:**
- `_shared/` mirror creates a two-step update: edit in `@compass/scoring`,
  then re-sync. Wave 1.A documents the sync as a manual step.
- The scoring package takes on product-content responsibilities (archetype
  names, descriptions) alongside pure algorithms. Accepted — a separate
  `@compass/archetypes` package is over-factored for six records.

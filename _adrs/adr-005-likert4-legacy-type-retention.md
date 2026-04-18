# ADR-005: Retain `LIKERT_MIN/MAX/RANGE` as legacy exports alongside `buildScoringConstants`

Date: 2026-04-16
Status: Accepted

## Context

The scoring pipeline was originally built for a 4-point Likert scale. Three
constants encoded this:

```ts
export const LIKERT_MIN = 1;
export const LIKERT_MAX = 4;
export const LIKERT_RANGE = 3;
```

CC+C subsequently decided the survey must support configurable scale sizes
(default 5-point, per the 2026-03-16 survey-update decisions). Each survey
now stores its scale in `settings.likertSize`, and scoring must divide by
`(likertSize - 1)` rather than the hardcoded `3`. This is tracked as a bug:
both report assemblers currently use `score / 4` and produce incorrect
normalized scores for any non-4-point survey.

`buildScoringConstants(scaleSize)` was added to `packages/scoring/src/constants.ts`
as the forward-facing API. It returns `{ min, max, range, decimals }` derived
from the survey's configured scale.

The legacy constants are still imported by `packages/scoring/src/normalize.ts`
and sibling modules, test fixtures, and the edge-function `_shared/` mirror.
Deleting them now would break the build before the migration lands.

## Decision

Retain `LIKERT_MIN`, `LIKERT_MAX`, and `LIKERT_RANGE` as deprecated exports:

1. Mark each constant `@deprecated` in `constants.ts`, pointing at
   `buildScoringConstants(scaleSize)`.
2. Mark the barrel re-export in `packages/scoring/src/index.ts` `@deprecated`
   with a link to this ADR.
3. Keep values (`1`, `4`, `3`) unchanged — correct for the legacy path.
4. Remove only after every call site migrates. Tracked in Wave 1.A.

## Consequences

**Positive:**
- Existing code compiles; migration can proceed incrementally per-module.
- `@deprecated` markers surface in IDE tooltips, steering new code to the
  correct API without requiring a sweeping rename.
- Tests keep their numeric fixtures; no test-data regeneration needed yet.

**Negative:**
- Two ways to express the same concept coexist during the migration window.
  Risk of new code picking the deprecated path. Mitigated by the deprecation
  marker and the explicit ADR pointer.
- The scoring package ships dead exports that will be removed. Accepted as
  the cost of keeping the migration safe and reviewable.

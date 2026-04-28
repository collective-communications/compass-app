# Scoring Validator — Architecture Spec

## Route

| Property | Value |
|---|---|
| Path | `/dev/scoring` |
| Guard | `import.meta.env.DEV === true` only — not registered in production builds |
| Auth | None — dev tool, no role check |
| Shell | No app shell (no topbar, no pill nav, no footer) — renders directly into `<Outlet />` |

### Route Registration

In `apps/web/src/routes/__root.tsx`, mount the dev route conditionally so Vite tree-shakes the entire module from production bundles:

```typescript
// __root.tsx
import { createScoringValidatorRoutes } from '../features/dev/scoring-validator/index.js';

const devRoutes = import.meta.env.DEV
  ? [createScoringValidatorRoutes(rootRoute)]
  : [];

export const routeTree = rootRoute.addChildren([
  // ... existing routes
  ...devRoutes,
]);
```

The conditional import (`import.meta.env.DEV`) is evaluated at build time by Vite. When `DEV` is `false`, the entire `features/dev/` module tree is excluded from the production bundle.

### Route Factory

```typescript
// features/dev/scoring-validator/routes.tsx
export function createScoringValidatorRoutes<TParent extends AnyRoute>(
  parentRoute: TParent,
) {
  return createRoute({
    getParentRoute: () => parentRoute,
    path: '/dev/scoring',
    component: ScoringValidator,
  });
}
```

No `beforeLoad` guard needed — the route is not registered in production.

---

## File Structure

```
apps/web/src/features/dev/
└── scoring-validator/
    ├── index.ts                          # re-exports createScoringValidatorRoutes
    ├── routes.tsx                        # TanStack Router route factory
    ├── ScoringValidator.tsx              # Root component; owns all state
    ├── components/
    │   ├── ConfigBar.tsx                 # Scale toggle, preset selector, reset, compare toggle
    │   ├── AnswerInputPanel.tsx          # Scrollable dimension + question list
    │   ├── QuestionRow.tsx               # Single question slider row
    │   ├── CompassPreview.tsx            # <Compass /> + 4 dimension score cards
    │   ├── ScoreBreakdownTab.tsx         # Dimension + sub-dimension score table
    │   ├── ArchetypeDistanceTab.tsx      # Archetype match card + full distance table
    │   ├── RiskFlagInspector.tsx         # Flag cards + editable threshold panel
    │   ├── TrustLadderTab.tsx            # 9-rung ladder visualization
    │   └── ComparePanel.tsx              # Side-by-side Scenario A / Δ / Scenario B
    └── data/
        ├── questions.ts                  # Static fixture: all 55 QuestionAnswer defs
        └── presets.ts                    # 8 named scenario presets
```

---

## State Management

### Location

All state lives in `ScoringValidator.tsx` via `useState`. No Zustand store — this is an ephemeral dev tool with no cross-component coordination requirements.

### State Shape

```typescript
// ScoringValidator.tsx
const [scaleSize, setScaleSize] = useState<4 | 5>(4);
const [answers, setAnswers] = useState<QuestionAnswer[]>(() => defaultAnswers(4));
const [riskThresholds, setRiskThresholds] = useState<RiskThresholds>(DEFAULT_RISK_THRESHOLDS);
const [compareMode, setCompareMode] = useState(false);
const [scenarioB, setScenarioB] = useState<QuestionAnswer[]>(() => defaultAnswers(4));
```

`defaultAnswers(scaleSize)` initializes all question values to the midpoint (`Math.floor((1 + scaleSize) / 2)`).

### Derived Outputs

All pipeline outputs derived via `useMemo`. The scoring functions are synchronous pure functions; no debounce is needed.

```typescript
const outputs = useMemo<ScoringValidatorOutputs>(() => {
  const answersWithMeta = toAnswerWithMeta(answers, scaleSize);
  const surveyScoreResult = computeSurveyScores('dev-tool', answersWithMeta, scaleSize);
  const archetypeMatch = identifyArchetype(surveyScoreResult.overallScores, ARCHETYPE_VECTORS);
  const allArchetypeDistances = ARCHETYPE_VECTORS.map((archetype) => {
    const scoreMap = toScoreMap(surveyScoreResult.overallScores);
    const distance = euclideanDistance(scoreMap, archetype.targetScores);
    return { archetype, distance, confidence: distanceToConfidence(distance) };
  }).sort((a, b) => a.distance - b.distance);
  const riskFlags = evaluateRiskFlags(surveyScoreResult.overallScores, riskThresholds);
  const trustLadder = calculateTrustLadderPosition(surveyScoreResult.overallScores);
  return { surveyScoreResult, archetypeMatch, allArchetypeDistances, riskFlags, trustLadder };
}, [answers, scaleSize, riskThresholds]);
```

### Scale Toggle Behavior

When `scaleSize` changes:
1. Clamp all answer values: `Math.min(answer.value, newScaleSize)`
2. Log clamped count to a transient banner if any values were clamped

```typescript
function handleScaleChange(newScale: 4 | 5) {
  setAnswers((prev) => prev.map((a) => ({ ...a, value: Math.min(a.value, newScale) })));
  setScaleSize(newScale);
}
```

### URL Sharing (Optional)

Serialize `{ scaleSize, answers: answers.map(a => a.value) }` as base64 JSON in the `?s=` search param. Parse on mount via `useSearch`. This allows sharing a specific scenario via URL — useful for async debugging.

Not required for v1. Can be added without any breaking changes to the state structure.

---

## Package Dependencies

Zero new packages. All dependencies are already in the monorepo.

| Package | Used for |
|---|---|
| `@compass/scoring` | `computeSurveyScores`, `identifyArchetype`, `euclideanDistance`, `distanceToConfidence`, `evaluateRiskFlags`, `calculateTrustLadderPosition`, `ARCHETYPE_VECTORS`, `DEFAULT_RISK_THRESHOLDS` |
| `@compass/compass` | `<Compass />` component |
| `@compass/tokens` | CSS custom properties (injected at app boot via `injectTokens()`) |
| `@compass/types` | `DimensionCode`, `DimensionScoreMap`, shared interfaces |

---

## Build Behavior

- `import.meta.env.DEV` is `true` during `vite dev` and `false` during `vite build`
- Vite statically replaces `import.meta.env.DEV` at build time; the conditional branch for `devRoutes` evaluates to `[]` in production
- Rollup tree-shakes the unreferenced `features/dev/` module tree from the production bundle
- No separate build config, no `VITE_DEV_TOOLS` env variable required
- Dev server: existing `bun run --filter @compass/web dev` on port 42333

---

## Styling Conventions

Follows the same rules as the rest of the web app:

- All colors via CSS custom properties from `@compass/tokens`: `var(--color-core)`, `var(--text-primary)`, `var(--severity-critical-border)`, etc.
- No hardcoded hex values in JSX/TSX inline styles
- Tailwind v4 utility classes for layout, spacing, typography
- Dimension colors: `var(--color-core)` (#0C3D50), `var(--color-clarity)` (#FF7F50), `var(--color-connection)` (#9FD7C3), `var(--color-collaboration)` (#E8B4A8)

---

## What This Tool Is Not

- **Not a Storybook story.** Storybook is for isolated component testing. This tool needs full pipeline integration across multiple packages simultaneously.
- **Not a test.** Unit tests in `packages/scoring` are authoritative. This tool aids exploration and visual validation.
- **Not a production feature.** The entire module is excluded from production builds by the `import.meta.env.DEV` guard.

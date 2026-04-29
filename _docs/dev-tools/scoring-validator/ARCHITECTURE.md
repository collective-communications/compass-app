# Scoring Validator — Architecture Spec

## Route

| Property | Value |
|---|---|
| Standalone app | `apps/validation` |
| Standalone path | `/` |
| Cloudflare Pages project | `compass-calculations` (`compass-calculations.pages.dev`) |
| Web dev path | `/dev/scoring` |
| Web dev guard | `import.meta.env.DEV === true` only — not registered in production builds |
| Auth | Microsoft 365 via Cloudflare Access on the Pages hostname; none on local dev |
| Host guard | Pages middleware only serves `compass-calculations.pages.dev`; aliases and preview URLs return 404 |
| Shell | No app shell (no topbar, no pill nav, no footer) |

### Route Registration

In `apps/web/src/routes/__root.tsx`, mount the dev route conditionally and keep the validator import inside the `import.meta.env.DEV` branch. This prevents production web builds from retaining the validator chunk.

```typescript
// __root.tsx
import { lazy, Suspense } from 'react';

const devRoutes = import.meta.env.DEV
  ? (() => {
      const LazyScoringValidator = lazy(async () => {
        const { ScoringValidator } = await import('@compass/scoring-validator');
        return { default: ScoringValidator };
      });

      return [
        createRoute({
          getParentRoute: () => rootRoute,
          path: '/dev/scoring',
          component: function ScoringValidatorDevRoute() {
            return (
              <Suspense fallback={<div>Loading scoring validator...</div>}>
                <LazyScoringValidator />
              </Suspense>
            );
          },
        }),
      ];
    })()
  : [];
```

The standalone Pages app renders the same package directly from `apps/validation/src/main.tsx`.

---

## File Structure

```
packages/
└── scoring-validator/
    ├── index.ts                          # re-exports <ScoringValidator />
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
        └── presets.ts                    # named scenario presets

apps/
└── validation/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/main.tsx                      # Renders <ScoringValidator /> directly
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
| `@compass/scoring-validator` | Standalone React validator UI package |
| `@compass/scoring` | `computeSurveyScores`, `identifyArchetype`, `euclideanDistance`, `distanceToConfidence`, `evaluateRiskFlags`, `calculateTrustLadderPosition`, `ARCHETYPE_VECTORS`, `DEFAULT_RISK_THRESHOLDS` |
| `@compass/compass` | `<Compass />` component |
| `@compass/tokens` | Shared CSS custom properties via `@compass/tokens/theme.css` |
| `@compass/types` | `DimensionCode`, `DimensionScoreMap`, shared interfaces |

---

## Build Behavior

- `apps/validation` builds as an independent Vite app with `bun run validation:build`
- Static output is `apps/validation/dist`
- Cloudflare Pages deploy command: `bun run deploy-validation`
- Cloudflare Access setup command: `bun run setup-validation-access`
- The web app still exposes `/dev/scoring` during `vite dev`
- Production web builds do not include `@compass/scoring-validator` assets because the dynamic import only exists inside the `import.meta.env.DEV` branch
- No `VITE_DEV_TOOLS` env variable required

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
- **Not a production feature in the main web app.** The validator is published as a separate internal tool through `apps/validation`.

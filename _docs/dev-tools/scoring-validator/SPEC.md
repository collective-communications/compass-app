# Scoring Validator — Specification

A dev-only web tool for validating the Collective Culture Compass scoring pipeline interactively.

---

## Purpose

The scoring pipeline (`packages/scoring`) is a set of pure functions with several stacked layers:

```
normalize → dimension score → sub-dimension score
  → archetype identification (Euclidean distance)
  → risk flag evaluation
  → trust ladder classification
```

Each layer has configuration surface: `scaleSize`, `reverseScored`, `weight`, risk thresholds, and archetype vectors. The Scoring Validator makes it possible to build `AnswerWithMeta[]` inputs via sliders, see all pipeline outputs update in real-time, and confirm the pipeline produces expected results — without going through the full survey flow.

---

## Users

Developers working on:
- `packages/scoring` — adding functions, tuning thresholds, validating formulas
- `packages/compass` — verifying score-to-visual mapping
- `apps/web` results feature — confirming UI reflects correct pipeline outputs

Not a user-facing tool. Not deployed to production.

---

## Non-Goals

- No auth or role checks
- No Supabase calls — entirely client-side
- No persistence across page reloads (URL sharing is optional)
- No support for segment scoring or `ResponseWithMeta` (uses flat `AnswerWithMeta[]`)
- Not a test replacement — unit tests remain authoritative; this tool aids exploration

---

## Key Features

| # | Feature | Description |
|---|---|---|
| 1 | **Answer Input** | Per-question sliders grouped by dimension; reverse-scored indicator; weight display; sub-dimension view toggle |
| 2 | **Live Compass** | `<Compass />` renders at 280px, updates on every slider change |
| 3 | **Score Breakdown** | All dimension + sub-dimension scores: raw (1–N) and normalized (0–100%) |
| 4 | **Archetype Explorer** | Matched archetype card + full distance table for all 6 archetypes |
| 5 | **Risk Flag Inspector** | Active flags with severity; proximity to threshold boundaries; live threshold editing |
| 6 | **Trust Ladder** | 9-rung visualization with achieved/in_progress/not_started status |
| 7 | **Scale Toggle** | Switch between 4-point and 5-point Likert; scores recalculate immediately |
| 8 | **Preset Scenarios** | 8 named fixtures covering all archetype regions and edge cases |
| 9 | **Diff/Compare Mode** | Two-scenario side-by-side with delta column |

---

## Document Index

| Document | Contents |
|---|---|
| [SCREENS.md](./SCREENS.md) | Layout diagram, panel-by-panel interaction spec |
| [DATA.md](./DATA.md) | Complete question bank fixture (55 Qs), 8 preset scenarios, data contracts |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Route registration, component tree, dev guard, package dependencies |

---

## Route

`/dev/scoring` — guarded to `import.meta.env.DEV` only. Not linked from any nav; access by typing the URL directly.

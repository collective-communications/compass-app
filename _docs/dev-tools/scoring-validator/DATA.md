# Scoring Validator — Data Spec

## Question Bank Fixture

Static fixture used as the tool's canonical question set. Maps all 55 Likert questions to the `AnswerWithMeta` shape required by `computeSurveyScores`.

**Source of truth:** `_docs/product/ccc-survey-questions.md` + `supabase/migrations/` (question table schema).

**Reverse-scored questions (12):** Q13, Q14, Q16, Q20, Q21, Q27, Q30, Q34, Q43, Q46, Q49, Q55

### Full Question Table

| Q# | dimensionCode | subDimensionCode | reverseScored | weight | Question text |
|---|---|---|---|---|---|
| Q1 | core | psychological_safety | false | 1.0 | I feel comfortable admitting mistakes or uncertainties. |
| Q2 | core | psychological_safety | false | 1.0 | It's safe to bring up problems or tough issues on my team. |
| Q3 | core | trust | false | 1.0 | I assume my colleagues have positive intentions, even during disagreements. |
| Q4 | core | trust | false | 1.0 | I trust that my leaders will follow through on their commitments. |
| Q5 | core | trust | false | 1.0 | I trust the information I receive from my leaders. |
| Q6 | core | fairness_integrity | false | 1.0 | Our purpose and values are evident in everyday actions. |
| Q7 | core | fairness_integrity | false | 1.0 | Decisions that affect people in our organization are made fairly and consistently. |
| Q8 | core | fairness_integrity | false | 1.0 | People are held to the same standards, regardless of their position or who they are. |
| Q9 | core | purpose_meaning | false | 1.0 | I understand why this organization exists and what it stands for. |
| Q10 | core | purpose_meaning | false | 1.0 | The work I do here gives me a sense of personal meaning. |
| Q11 | core | purpose_meaning | false | 1.0 | Working here feels consistent with what I stand for personally. |
| Q12 | core | leader_behaviour | false | 1.0 | Leaders' actions align with what they say. |
| Q13 | core | leader_behaviour | **true** | 1.0 | I often receive mixed messages from different leaders. |
| Q14 | clarity | decision_making | **true** | 1.0 | Priorities often change without clear explanation. |
| Q15 | clarity | decision_making | false | 1.0 | The reasons behind major decisions are communicated. |
| Q16 | clarity | decision_making | **true** | 1.0 | I don't know what decisions I am allowed to make. |
| Q17 | clarity | decision_making | false | 1.0 | When expectations change, I understand why. |
| Q18 | clarity | role_clarity | false | 1.0 | I know what's expected of me in my role. |
| Q19 | clarity | role_clarity | false | 1.0 | It's clear who is responsible for what on my team. |
| Q20 | clarity | role_clarity | **true** | 1.0 | I often do work that I'm not sure if I should be doing because responsibilities aren't clear. |
| Q21 | clarity | strategic_clarity | **true** | 1.0 | I often feel unsure about where the organization is heading. |
| Q22 | clarity | strategic_clarity | false | 1.0 | I understand how my team's work connects to organizational priorities. |
| Q23 | clarity | empowerment | false | 1.0 | Our tools and technology make collaboration simple and efficient. |
| Q24 | clarity | empowerment | false | 1.0 | I know where to find what I need without asking multiple people. |
| Q25 | clarity | goal_alignment | false | 1.0 | I can see how my work contributes to something meaningful. |
| Q26 | clarity | goal_alignment | false | 1.0 | My team's goals clearly support the organization's top priorities. |
| Q27 | clarity | goal_alignment | **true** | 1.0 | I sometimes work on things that don't seem connected to any larger goal. |
| Q28 | connection | belonging_inclusion | false | 1.0 | I feel seen and included, regardless of my role. |
| Q29 | connection | belonging_inclusion | false | 1.0 | I have fun at work. |
| Q30 | connection | belonging_inclusion | **true** | 1.0 | I feel lonely at work. |
| Q31 | connection | belonging_inclusion | false | 1.0 | I feel a genuine sense of belonging here. |
| Q32 | connection | employee_voice | false | 1.0 | I can express a different point of view without negative consequences. |
| Q33 | connection | employee_voice | false | 1.0 | When I speak up, my input genuinely influences decisions. |
| Q34 | connection | employee_voice | **true** | 1.0 | Feedback here often goes into a black hole. |
| Q35 | connection | information_flow | false | 1.0 | Communication between all levels of the organization feels open. |
| Q36 | connection | information_flow | false | 1.0 | Important information reaches me in time for me to act on it. |
| Q37 | connection | information_flow | false | 1.0 | Information flows well between teams, not just within them. |
| Q38 | connection | shared_identity | false | 1.0 | Team members look out for each other. |
| Q39 | connection | shared_identity | false | 1.0 | There is a strong sense of 'we're all in this together' across the organization. |
| Q40 | connection | involvement | false | 1.0 | I have a say in decisions that affect my day-to-day work. |
| Q41 | connection | involvement | false | 1.0 | People closest to the work are included in decisions about it. |
| Q42 | connection | recognition | false | 1.0 | I feel recognized for the contributions that matter most. |
| Q43 | connection | recognition | **true** | 1.0 | Recognition here often feels like a box-ticking exercise rather than genuine appreciation. |
| Q44 | collaboration | sustainable_pace | false | 1.0 | We have the right balance between collaboration time and focus time. |
| Q45 | collaboration | sustainable_pace | false | 1.0 | The pace of work here is sustainable over the long term. |
| Q46 | collaboration | adaptability_learning | **true** | 1.0 | When something goes wrong, blame is a common first reaction. |
| Q47 | collaboration | adaptability_learning | false | 1.0 | Our team regularly reflects on what's working and what isn't, and adjusts. |
| Q48 | collaboration | cross_functional | false | 1.0 | It's easy to access the people or information I need to do my job. |
| Q49 | collaboration | cross_functional | **true** | 1.0 | There are silos in our organization. |
| Q50 | collaboration | cross_functional | false | 1.0 | I have opportunities to co-create and problem-solve across functions. |
| Q51 | collaboration | ways_of_working | false | 1.0 | We have the right balance between meetings and focus time. |
| Q52 | collaboration | ways_of_working | false | 1.0 | We have clear processes for how we get work done. |
| Q53 | collaboration | ownership_accountability | false | 1.0 | People here follow through on their commitments. |
| Q54 | collaboration | ownership_accountability | false | 1.0 | I understand what is expected of me. |
| Q55 | collaboration | ownership_accountability | **true** | 1.0 | Things fall through the cracks because nobody clearly owns them. |

**Note on S4 (cross-dimensional question):** The DB stores the system health question "I am proud to be a team member at this organization" as four separate rows with `weight=0.25`, one per dimension. It is omitted from this fixture to keep the tool simple. A future iteration can add a cross-dimensional question section.

---

## Sub-Dimension Summary

21 sub-dimensions across 4 dimensions.

| dimensionCode | subDimensionCode | Question count |
|---|---|---|
| core | psychological_safety | 2 (Q1–Q2) |
| core | trust | 3 (Q3–Q5) |
| core | fairness_integrity | 3 (Q6–Q8) |
| core | purpose_meaning | 3 (Q9–Q11) |
| core | leader_behaviour | 2 (Q12–Q13) |
| clarity | decision_making | 4 (Q14–Q17) |
| clarity | role_clarity | 3 (Q18–Q20) |
| clarity | strategic_clarity | 2 (Q21–Q22) |
| clarity | empowerment | 2 (Q23–Q24) |
| clarity | goal_alignment | 3 (Q25–Q27) |
| connection | belonging_inclusion | 4 (Q28–Q31) |
| connection | employee_voice | 3 (Q32–Q34) |
| connection | information_flow | 3 (Q35–Q37) |
| connection | shared_identity | 2 (Q38–Q39) |
| connection | involvement | 2 (Q40–Q41) |
| connection | recognition | 2 (Q42–Q43) |
| collaboration | sustainable_pace | 2 (Q44–Q45) |
| collaboration | adaptability_learning | 2 (Q46–Q47) |
| collaboration | cross_functional | 3 (Q48–Q50) |
| collaboration | ways_of_working | 2 (Q51–Q52) |
| collaboration | ownership_accountability | 3 (Q53–Q55) |

---

## Archetype Vectors

Source: `packages/scoring/src/archetypes.ts`. These are the targets used by `identifyArchetype` (Euclidean distance in 4D score space).

| id | name | core | clarity | connection | collaboration | displayOrder |
|---|---|---|---|---|---|---|
| balanced | Balanced | 80 | 80 | 80 | 80 | 0 |
| clarity-driven | Clarity-Driven | 70 | 90 | 60 | 65 | 1 |
| connection-driven | Connection-Driven | 70 | 60 | 90 | 65 | 2 |
| collaboration-driven | Collaboration-Driven | 70 | 65 | 65 | 90 | 3 |
| core-fragile | Core-Fragile | 40 | 65 | 65 | 65 | 4 |
| disconnected | Disconnected | 35 | 35 | 35 | 35 | 5 |

Confidence thresholds (from `packages/scoring/src/archetype.ts`):
- `CONFIDENCE_STRONG = 15` — distance < 15
- `CONFIDENCE_MODERATE = 25` — distance 15–24.99
- `CONFIDENCE_WEAK` — distance ≥ 25

---

## Preset Scenarios

Eight named scenarios covering key regions of the score space and edge cases. Each preset loads a complete answer set.

### Scoring formula reference

For a dimension with N questions (all weight 1.0, no reverse scoring):
```
rawScore  = (sum of normalized values) / N
score (%) = ((rawScore - 1) / (scaleSize - 1)) × 100
```

For reverse-scored questions: `normalizedValue = scaleSize + 1 - rawValue`

### How to read the "answer strategy" column

Each cell describes what value to set for that category of question:
- `non-rev: X` — set all non-reverse-scored questions in this dimension to X
- `rev: X` — set all reverse-scored questions in this dimension to X (raw value before reversal)

---

### Preset 1 — Healthy Org

**Scale:** 4-point

**Purpose:** Confirm that all-max answers produce 100% on all dimensions.

| Dimension | non-rev | rev | Normalized value | Expected score |
|---|---|---|---|---|
| Core | 4 | 1 | 4 for all | 100.00% |
| Clarity | 4 | 1 | 4 for all | 100.00% |
| Connection | 4 | 1 | 4 for all | 100.00% |
| Collaboration | 4 | 1 | 4 for all | 100.00% |

**Expected outputs:**
- `coreHealth`: `healthy`
- Closest archetype: `balanced` — distance = `sqrt(4 × (100−80)²)` = **40.00** — `WEAK`
  - Note: all archetypes are far from (100,100,100,100); balanced wins because its distance is lowest
- Risk flags: none
- Trust ladder: all rungs `achieved` (rawScore = 4 > 3.0 threshold); current level = 9

---

### Preset 2 — Broken Core

**Scale:** 4-point

**Purpose:** Confirm core critical risk flag, broken health, and correct behavior when outer dimensions are healthy.

| Dimension | non-rev | rev | Normalized value | Expected score |
|---|---|---|---|---|
| Core | 1 | 4 | 1 for all | 0.00% |
| Clarity | 4 | 1 | 4 for all | 100.00% |
| Connection | 4 | 1 | 4 for all | 100.00% |
| Collaboration | 4 | 1 | 4 for all | 100.00% |

**Expected outputs:**
- `coreHealth`: `broken`
- Closest archetype: `core-fragile` — distance from (0, 100, 100, 100) to (40, 65, 65, 65) = `sqrt(40² + 35² + 35² + 35²)` = **72.63** — `WEAK`
- Risk flags: `[{ dimensionCode: 'core', severity: 'critical' }]` (no high flag for core since critical suppresses it)
- Trust ladder: core rungs 1–2 `not_started` (rawScore = 1); clarity, connection, collaboration rungs all `achieved`

---

### Preset 3 — Fragile Core

**Scale:** 4-point

**Purpose:** Validate the `fragile` health classification and `medium` risk flag.

| Dimension | non-rev | rev | Normalized value | Expected score |
|---|---|---|---|---|
| Core | 3 | 2 | 3 for all | 66.67% |
| Clarity | 4 | 1 | 4 for all | 100.00% |
| Connection | 4 | 1 | 4 for all | 100.00% |
| Collaboration | 4 | 1 | 4 for all | 100.00% |

**Expected outputs:**
- `coreHealth`: `fragile` (50 ≤ 66.67 ≤ 70)
- Closest archetype: `balanced` — distance from (66.67, 100, 100, 100) to (80, 80, 80, 80) = `sqrt(13.33² + 20² + 20² + 20²)` ≈ **33.1** — `WEAK`
- Risk flags: `[{ dimensionCode: 'core', severity: 'medium', score: 66.67 }]`

---

### Preset 4 — Disconnected

**Scale:** 4-point

**Purpose:** Validate all-min behavior, disconnected archetype, and multiple high risk flags.

| Dimension | non-rev | rev | Normalized value | Expected score |
|---|---|---|---|---|
| Core | 1 | 4 | 1 for all | 0.00% |
| Clarity | 1 | 4 | 1 for all | 0.00% |
| Connection | 1 | 4 | 1 for all | 0.00% |
| Collaboration | 1 | 4 | 1 for all | 0.00% |

**Expected outputs:**
- `coreHealth`: `broken`
- Closest archetype: `disconnected` — distance from (0,0,0,0) to (35,35,35,35) = `sqrt(4 × 35²)` = **70.00** — `WEAK`
- Risk flags: core critical + high flags for clarity, connection, collaboration (core does not get duplicate high since it's already critical)
- Trust ladder: all rungs `not_started`

---

### Preset 5 — Clarity-Driven

**Scale:** 4-point

**Purpose:** Validate archetype matching for clarity-driven target vector (core 70, clarity 90, connection 60, collaboration 65).

**Calibration:** Target score → Likert value = `round(target/100 × (scaleSize−1) + 1)` for non-reversed questions.

| Dimension | Target | Formula | non-rev value | rev value | Actual score |
|---|---|---|---|---|---|
| Core | 70% | round(0.70 × 3 + 1) = 3 | 3 | 2 | 66.67% |
| Clarity | 90% | round(0.90 × 3 + 1) = 4 | 4 | 1 | 100.00% |
| Connection | 60% | round(0.60 × 3 + 1) = 3 | 3 | 2 | 66.67% |
| Collaboration | 65% | round(0.65 × 3 + 1) = 3 | 3 | 2 | 66.67% |

Note: integer Likert values only approximate target percentages; actual scores will be 66.67% or 100% (not exact 70/90/60/65). The archetype match is validated by distance ranking, not exact score match.

**Expected outputs:**
- `coreHealth`: `fragile` (core = 66.67%)
- Closest archetype: `clarity-driven` — validate in tool that this wins over balanced
- Risk flags: `medium` for core (66.67%); no high flags (all dimensions ≥ 40)

---

### Preset 6 — Connection-Driven

**Scale:** 4-point

**Purpose:** Validate archetype matching for connection-driven target vector (core 70, clarity 60, connection 90, collaboration 65).

| Dimension | non-rev value | rev value | Actual score |
|---|---|---|---|
| Core | 3 | 2 | 66.67% |
| Clarity | 3 | 2 | 66.67% |
| Connection | 4 | 1 | 100.00% |
| Collaboration | 3 | 2 | 66.67% |

**Expected outputs:**
- Closest archetype: `connection-driven` — validate in tool
- `coreHealth`: `fragile`

---

### Preset 7 — Collaboration-Driven

**Scale:** 4-point

**Purpose:** Validate archetype matching for collaboration-driven target vector (core 70, clarity 65, connection 65, collaboration 90).

| Dimension | non-rev value | rev value | Actual score |
|---|---|---|---|
| Core | 3 | 2 | 66.67% |
| Clarity | 3 | 2 | 66.67% |
| Connection | 3 | 2 | 66.67% |
| Collaboration | 4 | 1 | 100.00% |

**Expected outputs:**
- Closest archetype: `collaboration-driven` — validate in tool
- `coreHealth`: `fragile`

---

### Preset 8 — Scale Parity

**Purpose:** Validate that the normalization formula produces identical percentage scores when the "intent" is the same across scale sizes. Specifically: the middle Likert value on both scales should produce 50%.

| Scale | Middle value | Formula | Expected score |
|---|---|---|---|
| 4-point | 2.5 (not possible) | — | 50.00% (theoretical only) |
| 4-point | 2 | (2−1)/3 × 100 | 33.33% |
| 4-point | 3 | (3−1)/3 × 100 | 66.67% |
| 5-point | 3 | (3−1)/4 × 100 | 50.00% |

**How to use:** Load this preset (sets all non-reversed to 3, reversed to calibrated equivalent). Then toggle the scale:
- On 4-point: scores show 66.67% across all dimensions
- Toggle to 5-point (values stay at 3): scores drop to 50.00%

This confirms the formula correctly adjusts for `scaleSize`. A value of 3 is the midpoint on a 5-point scale but above-midpoint on a 4-point scale — the percentage should reflect that.

**Preset loads:** all non-reversed at 3, reversed at (scaleSize − 3 + 1) = 2 on 4pt / 3 on 5pt.

---

## Data Contracts

### Tool State

```typescript
interface ScoringValidatorState {
  scaleSize: 4 | 5;
  answers: QuestionAnswer[];           // one entry per question in fixture
  riskThresholds: RiskThresholds;      // editable via Risk Flags tab
  compareMode: boolean;
  scenarioB?: QuestionAnswer[];        // only populated when compareMode = true
}

interface QuestionAnswer {
  questionId: string;                  // "Q1"–"Q55"
  value: number;                       // raw Likert value: 1–scaleSize
  reverseScored: boolean;              // from fixture
  dimensionCode: DimensionCode;        // from fixture
  subDimensionCode: string;            // from fixture
  weight: number;                      // from fixture (default 1.0)
}
```

### Derived Outputs (via `useMemo`)

```typescript
interface ScoringValidatorOutputs {
  // From computeSurveyScores()
  surveyScoreResult: SurveyScoreResult;

  // From identifyArchetype()
  archetypeMatch: ArchetypeMatch;

  // All 6 archetypes sorted by distance (lowest first)
  allArchetypeDistances: {
    archetype: ArchetypeVector;
    distance: number;
    confidence: 'strong' | 'moderate' | 'weak';
  }[];

  // From evaluateRiskFlags()
  riskFlags: RiskFlag[];

  // From calculateTrustLadderPosition()
  trustLadder: TrustLadderResult;
}
```

### Mapping `QuestionAnswer[]` → `AnswerWithMeta[]`

```typescript
// Passed to computeSurveyScores()
const answersWithMeta: AnswerWithMeta[] = state.answers.map((q) => ({
  questionId: q.questionId,
  value: q.value,
  reverseScored: q.reverseScored,
  dimensionId: q.questionId,        // tool uses questionId as dimensionId (no DB UUIDs)
  dimensionCode: q.dimensionCode,
  weight: q.weight,
  subDimensionCode: q.subDimensionCode,
}));
```

### Mapping `DimensionScoreMap` → `CompassProps.scores`

```typescript
const DIMENSION_COLORS: Record<DimensionCode, string> = {
  core: '#0C3D50',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
};

const DIMENSION_LABELS: Record<DimensionCode, string> = {
  core: 'Core',
  clarity: 'Clarity',
  connection: 'Connection',
  collaboration: 'Collaboration',
};

const compassScores = (['core', 'clarity', 'connection', 'collaboration'] as const).map(
  (dim) => ({
    dimension: dim,
    score: outputs.surveyScoreResult.overallScores[dim]?.score ?? 0,
    color: DIMENSION_COLORS[dim],
    label: DIMENSION_LABELS[dim],
  }),
);
```

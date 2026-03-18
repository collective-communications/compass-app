import { describe, expect, test } from 'bun:test';
import { calculateAllDimensionScores } from './dimension-score.js';
import { identifyArchetype } from './archetype.js';
import { evaluateRiskFlags } from './risk-flags.js';
import { classifyCoreHealth } from './core-health.js';
import type { AnswerWithMeta, DimensionCode } from './types.js';
import type { ArchetypeVector } from './archetype-types.js';

// ---------------------------------------------------------------------------
// Test archetypes — four distinct culture profiles
// ---------------------------------------------------------------------------

const ARCHETYPES: ArchetypeVector[] = [
  {
    id: 'arch-1',
    code: 'aligned',
    name: 'Aligned Culture',
    description: 'Strong across all dimensions',
    targetScores: { core: 85, clarity: 85, connection: 80, collaboration: 80 },
    displayOrder: 1,
  },
  {
    id: 'arch-2',
    code: 'siloed',
    name: 'Siloed Culture',
    description: 'Strong core but weak collaboration and connection',
    targetScores: { core: 75, clarity: 70, connection: 35, collaboration: 30 },
    displayOrder: 2,
  },
  {
    id: 'arch-3',
    code: 'fractured',
    name: 'Fractured Culture',
    description: 'Weak core with mixed outer dimensions',
    targetScores: { core: 30, clarity: 50, connection: 45, collaboration: 55 },
    displayOrder: 3,
  },
  {
    id: 'arch-4',
    code: 'social',
    name: 'Social Culture',
    description: 'Strong connection but weak clarity',
    targetScores: { core: 60, clarity: 40, connection: 85, collaboration: 75 },
    displayOrder: 4,
  },
];

// ---------------------------------------------------------------------------
// Helpers to build realistic answer sets
// ---------------------------------------------------------------------------

/** Deterministic counter for generating unique question IDs without Math.random. */
let questionIdCounter = 0;

/** Create an answer for a given dimension. */
function answer(
  dimension: DimensionCode,
  value: 1 | 2 | 3 | 4,
  opts?: { reversed?: boolean; weight?: number; questionId?: string },
): AnswerWithMeta {
  return {
    questionId: opts?.questionId ?? `q-${dimension}-auto-${++questionIdCounter}`,
    value,
    reverseScored: opts?.reversed ?? false,
    dimensionId: `dim-${dimension}`,
    dimensionCode: dimension,
    weight: opts?.weight ?? 1,
  };
}

/** Create a block of answers for one dimension with the given raw values. */
function dimensionAnswers(
  dimension: DimensionCode,
  values: (1 | 2 | 3 | 4)[],
  reversals?: boolean[],
): AnswerWithMeta[] {
  return values.map((v, i) =>
    answer(dimension, v, {
      reversed: reversals?.[i] ?? false,
      questionId: `q-${dimension}-${i + 1}`,
    }),
  );
}

// ---------------------------------------------------------------------------
// Full pipeline helper
// ---------------------------------------------------------------------------

function runPipeline(answers: AnswerWithMeta[]) {
  const dimensionScores = calculateAllDimensionScores(answers);
  const archetypeMatch = identifyArchetype(dimensionScores, ARCHETYPES);
  const riskFlags = evaluateRiskFlags(dimensionScores);
  const coreHealth = classifyCoreHealth(dimensionScores.core.score);

  return { dimensionScores, archetypeMatch, riskFlags, coreHealth };
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

describe('Scoring pipeline integration', () => {
  test('Scenario 1: Healthy org — all dimensions 70%+, no critical flags, closest archetype is "aligned"', () => {
    // All 4s and 3s → scores well above 70%.
    // Include reverse-scored items: value=1 reversed → normalized to 4.
    const answers = [
      ...dimensionAnswers('core', [4, 4, 3, 4, 4], [false, false, false, true, false]),
      // ^-- reverse on index 3: value 4 reversed → 1, but we want high scores,
      // so use value=1 for the reversed item to get normalized 4
      ...dimensionAnswers('clarity', [4, 3, 4, 3, 4]),
      ...dimensionAnswers('connection', [3, 4, 4, 3, 4], [false, false, false, true, false]),
      ...dimensionAnswers('collaboration', [4, 3, 4, 4, 3]),
    ];

    // Fix: for high scores with reversed items, the reversed item should have
    // a low raw value so it normalizes high.
    answers[3]!.value = 1; // core reversed item: 1 → normalized 4
    answers[13]!.value = 1; // connection reversed item: 1 → normalized 4

    const { dimensionScores, archetypeMatch, riskFlags, coreHealth } = runPipeline(answers);

    // All dimension scores should be above 70%
    expect(dimensionScores.core.score).toBeGreaterThan(70);
    expect(dimensionScores.clarity.score).toBeGreaterThan(70);
    expect(dimensionScores.connection.score).toBeGreaterThan(70);
    expect(dimensionScores.collaboration.score).toBeGreaterThan(70);

    // Core health should be healthy
    expect(coreHealth).toBe('healthy');

    // No critical or high risk flags
    const criticalOrHigh = riskFlags.filter((f) => f.severity === 'critical' || f.severity === 'high');
    expect(criticalOrHigh).toHaveLength(0);

    // Closest archetype should be "aligned" (high across all dimensions)
    expect(archetypeMatch.archetype.code).toBe('aligned');
    expect(archetypeMatch.confidence).not.toBe('weak');
  });

  test('Scenario 2: At-risk org — core <50%, one dimension <40% → broken health, critical + high flags', () => {
    // Core: mostly 1s and 2s → low score
    // Collaboration: all 1s → very low
    // Clarity and Connection: moderate
    const answers = [
      ...dimensionAnswers('core', [1, 2, 1, 1, 2]),
      ...dimensionAnswers('clarity', [3, 2, 3, 2, 3]),
      ...dimensionAnswers('connection', [2, 3, 2, 3, 2]),
      ...dimensionAnswers('collaboration', [1, 1, 1, 1, 2]),
    ];

    const { dimensionScores, archetypeMatch, riskFlags, coreHealth } = runPipeline(answers);

    // Core should be below 50%
    expect(dimensionScores.core.score).toBeLessThan(50);

    // Collaboration should be below 40%
    expect(dimensionScores.collaboration.score).toBeLessThan(40);

    // Core health should be broken
    expect(coreHealth).toBe('broken');

    // Should have a critical flag for core
    const criticalFlags = riskFlags.filter((f) => f.severity === 'critical');
    expect(criticalFlags.length).toBeGreaterThanOrEqual(1);
    expect(criticalFlags.some((f) => f.dimensionCode === 'core')).toBe(true);

    // Should have a high flag for collaboration
    const highFlags = riskFlags.filter((f) => f.severity === 'high');
    expect(highFlags.some((f) => f.dimensionCode === 'collaboration')).toBe(true);

    // Risk flags should be sorted by severity (critical first)
    if (riskFlags.length > 1) {
      expect(riskFlags[0]!.severity).toBe('critical');
    }

    // Closest archetype should be "fractured" (weak core, mixed others)
    expect(archetypeMatch.archetype.code).toBe('fractured');
  });

  test('Scenario 3: Mixed org — varying scores, correct archetype selection and risk flags', () => {
    // High core and clarity, low connection and collaboration → "siloed"
    const answers = [
      ...dimensionAnswers('core', [4, 3, 3, 4, 3]),
      ...dimensionAnswers('clarity', [3, 3, 4, 3, 3]),
      ...dimensionAnswers('connection', [1, 2, 1, 1, 1]),
      ...dimensionAnswers('collaboration', [1, 1, 2, 1, 1]),
    ];

    const { dimensionScores, archetypeMatch, riskFlags, coreHealth } = runPipeline(answers);

    // Core should be healthy range
    expect(dimensionScores.core.score).toBeGreaterThan(55);

    // Connection and collaboration should be low
    expect(dimensionScores.connection.score).toBeLessThan(40);
    expect(dimensionScores.collaboration.score).toBeLessThan(40);

    // Core health: fragile or healthy depending on exact score
    expect(['healthy', 'fragile']).toContain(coreHealth);

    // Should have high risk flags for connection and collaboration
    const highFlags = riskFlags.filter((f) => f.severity === 'high');
    expect(highFlags.some((f) => f.dimensionCode === 'connection')).toBe(true);
    expect(highFlags.some((f) => f.dimensionCode === 'collaboration')).toBe(true);

    // No critical flags (core is above 50)
    const criticalFlags = riskFlags.filter((f) => f.severity === 'critical');
    expect(criticalFlags).toHaveLength(0);

    // Closest archetype should be "siloed" (strong core/clarity, weak connection/collaboration)
    expect(archetypeMatch.archetype.code).toBe('siloed');
  });

  test('Pipeline preserves response counts per dimension', () => {
    const answers = [
      ...dimensionAnswers('core', [3, 3, 3]),
      ...dimensionAnswers('clarity', [3, 3, 3, 3, 3]),
      ...dimensionAnswers('connection', [3, 3]),
      ...dimensionAnswers('collaboration', [3, 3, 3, 3]),
    ];

    const { dimensionScores } = runPipeline(answers);

    expect(dimensionScores.core.responseCount).toBe(3);
    expect(dimensionScores.clarity.responseCount).toBe(5);
    expect(dimensionScores.connection.responseCount).toBe(2);
    expect(dimensionScores.collaboration.responseCount).toBe(4);
  });

  test('Reverse-scored items correctly invert through the full pipeline', () => {
    // All answers are 1 (lowest), but all are reverse-scored → normalize to 4 (highest)
    // Score should be 100%: (4 - 1) / 3 * 100 = 100
    const dimensions: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];
    const answers = dimensions.flatMap((dim) =>
      dimensionAnswers(dim, [1, 1, 1], [true, true, true]),
    );

    const { dimensionScores, coreHealth } = runPipeline(answers);

    for (const dim of dimensions) {
      expect(dimensionScores[dim].score).toBe(100);
      expect(dimensionScores[dim].rawScore).toBe(4);
    }

    expect(coreHealth).toBe('healthy');
  });
});

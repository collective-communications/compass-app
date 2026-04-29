import { describe, it, expect } from 'bun:test';
import { PRESETS, type Preset } from './presets.js';
import {
  computeSurveyScores,
  identifyArchetype,
  evaluateRiskFlags,
  ARCHETYPE_VECTORS,
} from '@compass/scoring';
import type { AnswerWithMeta } from '@compass/scoring';
import type { QuestionAnswer } from './questions.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toAnswerWithMeta(q: QuestionAnswer): AnswerWithMeta {
  return {
    questionId: q.questionId,
    value: q.value,
    reverseScored: q.reverseScored,
    dimensionId: q.questionId,
    dimensionCode: q.dimensionCode,
    weight: q.weight,
    subDimensionCode: q.subDimensionCode,
  };
}

function getPreset(id: string): Preset {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Preset '${id}' not found`);
  return preset;
}

// ---------------------------------------------------------------------------
// Preset invariants
// ---------------------------------------------------------------------------

describe('PRESETS array', () => {
  it('has exactly 6 presets (River Valley + 5 archetype scenarios)', () => {
    expect(PRESETS.length).toBe(6);
  });

  it('all presets use 5-point scale', () => {
    for (const p of PRESETS) {
      expect(p.scaleSize).toBe(5);
    }
  });

  it('all presets have unique ids', () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all presets build 55 answers', () => {
    for (const p of PRESETS) {
      expect(p.build().length).toBe(55);
    }
  });

  it('first preset is river-valley (default)', () => {
    expect(PRESETS[0]?.id).toBe('river-valley');
  });
});

// ---------------------------------------------------------------------------
// River Valley Health baseline
// ---------------------------------------------------------------------------

describe('river-valley preset', () => {
  const preset = getPreset('river-valley');
  const answers = preset.build().map(toAnswerWithMeta);
  const result = computeSurveyScores('test', answers, preset.scaleSize);

  it('all dimension scores are between 0 and 100', () => {
    expect(result.overallScores.core.score).toBeGreaterThan(0);
    expect(result.overallScores.core.score).toBeLessThan(100);
    expect(result.overallScores.clarity.score).toBeGreaterThan(0);
    expect(result.overallScores.clarity.score).toBeLessThan(100);
    expect(result.overallScores.connection.score).toBeGreaterThan(0);
    expect(result.overallScores.connection.score).toBeLessThan(100);
    expect(result.overallScores.collaboration.score).toBeGreaterThan(0);
    expect(result.overallScores.collaboration.score).toBeLessThan(100);
  });

  it('coreHealth is fragile (moderate baseline, core 50–70%)', () => {
    expect(result.coreHealth).toBe('fragile');
  });

  it('archetype resolves to a known id', () => {
    const archetypeMatch = identifyArchetype(result.overallScores, ARCHETYPE_VECTORS);
    const validIds = ARCHETYPE_VECTORS.map((a) => a.id);
    expect(validIds).toContain(archetypeMatch.archetype.id);
  });
});

// ---------------------------------------------------------------------------
// Aligned & Thriving
// ---------------------------------------------------------------------------

describe('aligned-thriving preset', () => {
  const preset = getPreset('aligned-thriving');
  const answers = preset.build().map(toAnswerWithMeta);
  const result = computeSurveyScores('test', answers, preset.scaleSize);
  const archetypeMatch = identifyArchetype(result.overallScores, ARCHETYPE_VECTORS);

  it('all dimension scores are above 70%', () => {
    expect(result.overallScores.core.score).toBeGreaterThan(70);
    expect(result.overallScores.clarity.score).toBeGreaterThan(70);
    expect(result.overallScores.connection.score).toBeGreaterThan(70);
    expect(result.overallScores.collaboration.score).toBeGreaterThan(70);
  });

  it('coreHealth is healthy', () => {
    expect(result.coreHealth).toBe('healthy');
  });

  it('no risk flags', () => {
    const riskFlags = evaluateRiskFlags(result.overallScores);
    expect(riskFlags.length).toBe(0);
  });

  it('archetype is aligned', () => {
    expect(archetypeMatch.archetype.id).toBe('aligned');
  });
});

// ---------------------------------------------------------------------------
// Command & Control
// ---------------------------------------------------------------------------

describe('command-control preset', () => {
  const preset = getPreset('command-control');
  const answers = preset.build().map(toAnswerWithMeta);
  const result = computeSurveyScores('test', answers, preset.scaleSize);
  const archetypeMatch = identifyArchetype(result.overallScores, ARCHETYPE_VECTORS);

  it('clarity score is significantly higher than connection score', () => {
    expect(result.overallScores.clarity.score).toBeGreaterThan(
      result.overallScores.connection.score + 30,
    );
  });

  it('clarity score is significantly higher than collaboration score', () => {
    expect(result.overallScores.clarity.score).toBeGreaterThan(
      result.overallScores.collaboration.score + 30,
    );
  });

  it('coreHealth is broken (core just below 50%)', () => {
    expect(result.coreHealth).toBe('broken');
  });

  it('archetype is command_and_control', () => {
    expect(archetypeMatch.archetype.id).toBe('command_and_control');
  });
});

// ---------------------------------------------------------------------------
// Well-Intentioned but Disconnected
// ---------------------------------------------------------------------------

describe('well-intentioned preset', () => {
  const preset = getPreset('well-intentioned');
  const answers = preset.build().map(toAnswerWithMeta);
  const result = computeSurveyScores('test', answers, preset.scaleSize);
  const archetypeMatch = identifyArchetype(result.overallScores, ARCHETYPE_VECTORS);

  it('all dimension scores are between 40% and 70% (moderate zone)', () => {
    expect(result.overallScores.core.score).toBeGreaterThan(40);
    expect(result.overallScores.core.score).toBeLessThan(70);
    expect(result.overallScores.clarity.score).toBeGreaterThan(40);
    expect(result.overallScores.clarity.score).toBeLessThan(70);
    expect(result.overallScores.connection.score).toBeGreaterThan(30);
    expect(result.overallScores.connection.score).toBeLessThan(70);
    expect(result.overallScores.collaboration.score).toBeGreaterThan(40);
    expect(result.overallScores.collaboration.score).toBeLessThan(70);
  });

  it('coreHealth is fragile', () => {
    expect(result.coreHealth).toBe('fragile');
  });

  it('archetype is well_intentioned', () => {
    expect(archetypeMatch.archetype.id).toBe('well_intentioned');
  });
});

// ---------------------------------------------------------------------------
// Over-Collaborated
// ---------------------------------------------------------------------------

describe('over-collaborated preset', () => {
  const preset = getPreset('over-collaborated');
  const answers = preset.build().map(toAnswerWithMeta);
  const result = computeSurveyScores('test', answers, preset.scaleSize);
  const archetypeMatch = identifyArchetype(result.overallScores, ARCHETYPE_VECTORS);

  it('connection score is significantly higher than clarity score', () => {
    expect(result.overallScores.connection.score).toBeGreaterThan(
      result.overallScores.clarity.score + 25,
    );
  });

  it('collaboration score is significantly higher than clarity score', () => {
    expect(result.overallScores.collaboration.score).toBeGreaterThan(
      result.overallScores.clarity.score + 25,
    );
  });

  it('coreHealth is fragile', () => {
    expect(result.coreHealth).toBe('fragile');
  });

  it('archetype is over_collaborated', () => {
    expect(archetypeMatch.archetype.id).toBe('over_collaborated');
  });
});

// ---------------------------------------------------------------------------
// Busy but Burned Out
// ---------------------------------------------------------------------------

describe('busy-burned-out preset', () => {
  const preset = getPreset('busy-burned-out');
  const answers = preset.build().map(toAnswerWithMeta);
  const result = computeSurveyScores('test', answers, preset.scaleSize);
  const archetypeMatch = identifyArchetype(result.overallScores, ARCHETYPE_VECTORS);
  const riskFlags = evaluateRiskFlags(result.overallScores);

  it('all dimension scores are below 50%', () => {
    expect(result.overallScores.core.score).toBeLessThan(50);
    expect(result.overallScores.clarity.score).toBeLessThan(50);
    expect(result.overallScores.connection.score).toBeLessThan(50);
    expect(result.overallScores.collaboration.score).toBeLessThan(50);
  });

  it('coreHealth is broken', () => {
    expect(result.coreHealth).toBe('broken');
  });

  it('has at least one critical risk flag', () => {
    const criticalFlags = riskFlags.filter((f) => f.severity === 'critical');
    expect(criticalFlags.length).toBeGreaterThanOrEqual(1);
  });

  it('archetype is busy_but_burned', () => {
    expect(archetypeMatch.archetype.id).toBe('busy_but_burned');
  });
});

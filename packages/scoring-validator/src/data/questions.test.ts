import { describe, it, expect } from 'bun:test';
import { QUESTIONS, defaultAnswers } from './questions.js';

// ---------------------------------------------------------------------------
// Question bank fixture tests
// ---------------------------------------------------------------------------

describe('QUESTIONS', () => {
  it('contains exactly 55 questions', () => {
    expect(QUESTIONS.length).toBe(55);
  });

  it('reverse-scored question IDs match expected set', () => {
    const reversedIds = QUESTIONS
      .filter((q) => q.reverseScored)
      .map((q) => q.questionId)
      .sort();

    expect(reversedIds).toEqual([
      'Q13', 'Q14', 'Q16', 'Q20', 'Q21', 'Q27', 'Q30', 'Q34', 'Q43', 'Q46', 'Q49', 'Q55',
    ]);
  });

  it('has correct dimension distribution: core=13, clarity=14, connection=16, collaboration=12', () => {
    const counts: Record<string, number> = {};
    for (const q of QUESTIONS) {
      counts[q.dimensionCode] = (counts[q.dimensionCode] ?? 0) + 1;
    }
    expect(counts['core']).toBe(13);
    expect(counts['clarity']).toBe(14);
    expect(counts['connection']).toBe(16);
    expect(counts['collaboration']).toBe(12);
  });

  it('every question has weight === 1.0', () => {
    const allWeightOne = QUESTIONS.every((q) => q.weight === 1.0);
    expect(allWeightOne).toBe(true);
  });

  it('no question has an empty text', () => {
    const allNonEmpty = QUESTIONS.every((q) => q.text.length > 0);
    expect(allNonEmpty).toBe(true);
  });

  it('covers all 21 expected sub-dimension codes', () => {
    const EXPECTED_SUB_DIMENSIONS = new Set([
      // Core
      'psychological_safety',
      'trust',
      'fairness_integrity',
      'purpose_meaning',
      'leader_behaviour',
      // Clarity
      'decision_making',
      'role_clarity',
      'strategic_clarity',
      'empowerment',
      'goal_alignment',
      // Connection
      'belonging_inclusion',
      'employee_voice',
      'information_flow',
      'shared_identity',
      'involvement',
      'recognition',
      // Collaboration
      'sustainable_pace',
      'adaptability_learning',
      'cross_functional',
      'ways_of_working',
      'ownership_accountability',
    ]);

    const presentCodes = new Set(QUESTIONS.map((q) => q.subDimensionCode));

    for (const code of EXPECTED_SUB_DIMENSIONS) {
      expect(presentCodes.has(code)).toBe(true);
    }

    expect(presentCodes.size).toBe(21);
  });
});

// ---------------------------------------------------------------------------
// defaultAnswers factory
// ---------------------------------------------------------------------------

describe('defaultAnswers', () => {
  it('returns 55 answers all set to value 2 for 4-point scale', () => {
    const answers = defaultAnswers(4);
    expect(answers.length).toBe(55);
    const allMid = answers.every((a) => a.value === 2);
    expect(allMid).toBe(true);
  });

  it('returns 55 answers all set to value 3 for 5-point scale', () => {
    const answers = defaultAnswers(5);
    expect(answers.length).toBe(55);
    const allMid = answers.every((a) => a.value === 3);
    expect(allMid).toBe(true);
  });
});

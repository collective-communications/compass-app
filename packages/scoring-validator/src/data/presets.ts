import type { QuestionAnswer, QuestionMeta } from './questions.js';
import { QUESTIONS } from './questions.js';
import { SCENARIO_DEFAULTS } from './seed-defaults.js';

export interface Preset {
  id: string;
  name: string;
  description: string;
  scaleSize: 4 | 5;
  build(): QuestionAnswer[];
}

function mapAnswers(
  scaleSize: 4 | 5,
  values: Record<string, number>,
): QuestionAnswer[] {
  const midpoint = Math.floor((1 + scaleSize) / 2);
  return QUESTIONS.map((q: QuestionMeta) => ({
    ...q,
    value: values[q.questionId] ?? midpoint,
  }));
}

export const PRESETS: readonly Preset[] = SCENARIO_DEFAULTS.map((s) => ({
  id: s.id,
  name: s.name,
  description: s.description,
  scaleSize: s.scaleSize,
  build(): QuestionAnswer[] {
    return mapAnswers(s.scaleSize, s.values);
  },
}));

export const DEFAULT_PRESET_ID = PRESETS[0]?.id ?? 'river-valley';

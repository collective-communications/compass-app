/** TanStack Query key factory for results feature queries. */
export const resultKeys = {
  all: ['results'] as const,

  surveyMeta: (surveyId: string) =>
    [...resultKeys.all, 'surveyMeta', surveyId] as const,

  overallScores: (surveyId: string) =>
    [...resultKeys.all, 'overallScores', surveyId] as const,

  segmentScores: (surveyId: string, segmentType: string, segmentValue?: string) =>
    [...resultKeys.all, 'segmentScores', surveyId, segmentType, segmentValue] as const,

  questionScores: (surveyId: string, dimensionCode?: string) =>
    [...resultKeys.all, 'questionScores', surveyId, dimensionCode] as const,

  dialogueResponses: (surveyId: string, questionId?: string) =>
    [...resultKeys.all, 'dialogueResponses', surveyId, questionId] as const,

  archetype: (surveyId: string) =>
    [...resultKeys.all, 'archetype', surveyId] as const,

  riskFlags: (surveyId: string) =>
    [...resultKeys.all, 'riskFlags', surveyId] as const,

  recommendations: (surveyId: string) =>
    [...resultKeys.all, 'recommendations', surveyId] as const,

  dialogueKeywords: (surveyId: string) =>
    [...resultKeys.all, 'dialogueKeywords', surveyId] as const,

  segmentQuestionScores: (surveyId: string, segmentType: string, segmentValue: string) =>
    [...resultKeys.all, 'segmentQuestionScores', surveyId, segmentType, segmentValue] as const,

  historyTab: (surveyId: string) =>
    [...resultKeys.all, 'historyTab', surveyId] as const,
};

/** Query key factory for recipient queries */
export const recipientKeys = {
  all: ['admin', 'recipients'] as const,
  list: (surveyId: string) => [...recipientKeys.all, 'list', surveyId] as const,
  stats: (surveyId: string) => [...recipientKeys.all, 'stats', surveyId] as const,
};

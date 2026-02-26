/**
 * SurveyContext holds resolved deployment data for child survey routes.
 * Only populated when a deployment resolves to 'valid' status.
 */
import { createContext, useContext, type ReactNode } from 'react';
import type { Deployment, Survey } from '@compass/types';

export interface SurveyContextValue {
  deployment: Deployment;
  survey: Survey;
  sessionToken: string;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

export interface SurveyProviderProps {
  value: SurveyContextValue;
  children: ReactNode;
}

/** Provider for resolved survey deployment data */
export function SurveyProvider({ value, children }: SurveyProviderProps): ReactNode {
  return <SurveyContext.Provider value={value}>{children}</SurveyContext.Provider>;
}

/** Access the resolved survey context. Throws if used outside SurveyProvider. */
export function useSurveyContext(): SurveyContextValue {
  const ctx = useContext(SurveyContext);
  if (!ctx) {
    throw new Error('useSurveyContext must be used within a SurveyProvider');
  }
  return ctx;
}

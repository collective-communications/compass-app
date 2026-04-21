/**
 * SurveyContext holds resolved deployment data for child survey routes.
 * Only populated when a deployment resolves to 'valid' status.
 */
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { DEFAULT_LIKERT_SIZE, type Deployment, type Survey } from '@compass/types';
import { registerTier3Content } from '../../../components/help/content/tier-3-survey';

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
  // Re-register the Tier 3 help content once the active survey resolves so
  // the keyboard-shortcut line ("1-N: Select answer option") reflects the
  // real Likert scale size for this survey. The initial registration in
  // main.tsx uses a fallback default for pre-survey renders.
  const likertSize = value.survey.settings?.likertSize ?? DEFAULT_LIKERT_SIZE;
  useEffect(() => {
    registerTier3Content(likertSize);
  }, [likertSize]);

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

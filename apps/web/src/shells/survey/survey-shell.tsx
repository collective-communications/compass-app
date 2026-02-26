import { useCallback, useState } from 'react';
import { SurveyHeader } from '../../components/survey/survey-header';
import { SurveyFooter } from '../../components/survey/survey-footer';

interface SurveyShellProps {
  /** Organization name passed through to the header. */
  orgName: string;
  /** Optional logo URL passed through to the header. */
  logoUrl?: string;
  /** Page content rendered inside the constrained content area. */
  children: React.ReactNode;
}

/**
 * Top-level layout shell for all survey screens.
 *
 * Enforces structural anonymity: no user info, no navigation.
 * Content is constrained to 600px max-width and centered on all viewports.
 */
export function SurveyShell({ orgName, logoUrl, children }: SurveyShellProps): React.ReactElement {
  const [_helpOpen, setHelpOpen] = useState(false);

  const handleHelpClick = useCallback((): void => {
    setHelpOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--grey-50)]">
      <SurveyHeader orgName={orgName} logoUrl={logoUrl} />

      <main className="mx-auto w-full max-w-[600px] flex-1 px-4 py-6">
        {children}
      </main>

      <SurveyFooter onHelpClick={handleHelpClick} />
    </div>
  );
}

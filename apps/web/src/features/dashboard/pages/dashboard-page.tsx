/**
 * Client dashboard page (route: /dashboard).
 * Tier 2 home screen showing welcome greeting, active survey card,
 * quick actions, and previous surveys list.
 */

import { type ReactElement } from 'react';
import { useAppNavigate } from '../../../hooks/use-app-navigate';
import { useAuthStore } from '../../../stores/auth-store';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { useClientAccess } from '../hooks/use-client-access';
import { ActiveSurveyCard } from '../components/active-survey-card';
import { QuickActions } from '../components/quick-actions';
import { PreviousSurveys } from '../components/previous-surveys';
import { DashboardCompassPreview } from '../components/dashboard-compass-preview';
import { AppErrorFallback } from '../../../components/ui/app-error-fallback';

/** Extract first name from a full name string */
function getFirstName(fullName: string | null): string {
  if (!fullName) return '';
  return fullName.split(' ')[0] ?? '';
}

export function DashboardPage(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const { activeSurvey, previousSurveys, isLoading, error, refetch, scores, scoresLoading } =
    useDashboardData({
      organizationId: user?.organizationId ?? null,
    });

  const navigate = useAppNavigate();
  const firstName = getFirstName(user?.fullName ?? null);
  const hasSurveys = activeSurvey !== null || previousSurveys.length > 0;

  // Build the deployment URL if an active deployment exists
  const deploymentUrl = activeSurvey?.deployment
    ? `${window.location.origin}/s/${activeSurvey.deployment.token}`
    : null;

  const clientAccessEnabled = useClientAccess({ organizationId: user?.organizationId ?? null });
  const resultsEnabled =
    (activeSurvey?.survey.scoresCalculated ?? false) && clientAccessEnabled;

  const handleSelectSurvey = (surveyId: string): void => {
    void navigate({ to: '/results/$surveyId/compass', params: { surveyId } });
  };

  return (
    <div className="container-default">
      {/* Welcome greeting */}
      {firstName && (
        <h1 className="mb-6 text-2xl font-semibold text-[var(--grey-900)]">
          Welcome back, {firstName}
        </h1>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-[var(--text-secondary)]">Loading dashboard...</p>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <AppErrorFallback error={error} onRetry={refetch} title="Dashboard" />
      )}

      {/* Empty state — no surveys at all */}
      {!isLoading && !error && !hasSurveys && (
        <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6 text-center">
          <p className="text-sm text-[var(--text-tertiary)]">
            No surveys yet. Your organization&apos;s first culture assessment is coming soon.
          </p>
        </div>
      )}

      {/* Dashboard content — two-column on desktop */}
      {!isLoading && !error && hasSurveys && (
        <div className="grid grid-cols-1 gap-5 md:layout-split-lg">
          {/* Left column: active survey + quick actions */}
          <div className="flex container-narrow flex-col gap-5">
            {activeSurvey && (
              <>
                <ActiveSurveyCard data={activeSurvey} />
                <QuickActions deploymentUrl={deploymentUrl} />
              </>
            )}

            {!activeSurvey && !resultsEnabled && (
              <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6 text-center">
                <p className="text-sm text-[var(--text-tertiary)]">
                  Results are being prepared. Your consultant will let you know when they&apos;re
                  ready to review.
                </p>
              </div>
            )}
          </div>

          {/* Right column: latest results with mini compass preview */}
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6">
              <h2 className="mb-4 text-base font-semibold text-[var(--grey-900)]">
                Latest Results
              </h2>
              {activeSurvey?.survey.scoresCalculated === true ? (
                <DashboardCompassPreview scores={scores} isLoading={scoresLoading} />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-[var(--grey-100)] bg-[var(--surface-card)]">
                  <p className="text-xs text-[var(--text-tertiary)]">Compass Preview</p>
                </div>
              )}
              {resultsEnabled && activeSurvey && (
                <button
                  type="button"
                  onClick={() => handleSelectSurvey(activeSurvey.survey.id)}
                  className="mt-4 w-full rounded-lg bg-[var(--color-interactive)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  View Full Results
                </button>
              )}
            </div>
          </div>

          {/* Previous surveys — full width, horizontal scroll on desktop */}
          {previousSurveys.length > 0 && (
            <div className="md:col-span-2">
              <PreviousSurveys
                surveys={previousSurveys}
                onSelectSurvey={handleSelectSurvey}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

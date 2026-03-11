/**
 * Client dashboard page (route: /dashboard).
 * Tier 2 home screen showing welcome greeting, active survey card,
 * quick actions, and previous surveys list.
 */

import type { ReactElement } from 'react';
import { useAppNavigate } from '../../../hooks/use-app-navigate';
import { AppShell } from '../../../components/shells/app-shell';
import { useAuthStore } from '../../../stores/auth-store';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { useClientAccess } from '../hooks/use-client-access';
import { ActiveSurveyCard } from '../components/active-survey-card';
import { QuickActions } from '../components/quick-actions';
import { PreviousSurveys } from '../components/previous-surveys';

/** Extract first name from a full name string */
function getFirstName(fullName: string | null): string {
  if (!fullName) return '';
  return fullName.split(' ')[0] ?? '';
}

export function DashboardPage(): ReactElement {
  const user = useAuthStore((s) => s.user);
  const { activeSurvey, previousSurveys, isLoading, error } = useDashboardData({
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

  const handleNavigate = (path: string): void => {
    void navigate({ to: path });
  };

  const handleSelectSurvey = (surveyId: string): void => {
    void navigate({ to: '/results/$surveyId/compass', params: { surveyId } });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1232px] px-4 py-6">
        {/* Welcome greeting */}
        {firstName && (
          <h1 className="mb-6 text-2xl font-semibold text-[var(--grey-900)]">
            Welcome back, {firstName}
          </h1>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-[var(--grey-500)]">Loading dashboard...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              Something went wrong loading your dashboard. Please refresh to try again.
            </p>
          </div>
        )}

        {/* Empty state — no surveys at all */}
        {!isLoading && !error && !hasSurveys && (
          <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6 text-center">
            <p className="text-sm text-[var(--grey-600)]">
              No surveys yet. Your organization&apos;s first culture assessment is coming soon.
            </p>
          </div>
        )}

        {/* Dashboard content — two-column on desktop */}
        {!isLoading && !error && hasSurveys && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_432px] md:gap-10">
            {/* Left column: active survey + quick actions */}
            <div className="flex max-w-[760px] flex-col gap-5">
              {activeSurvey && (
                <>
                  <ActiveSurveyCard data={activeSurvey} />
                  <QuickActions
                    deploymentUrl={deploymentUrl}
                    surveyId={activeSurvey.survey.id}
                    resultsEnabled={resultsEnabled}
                    onNavigate={handleNavigate}
                  />
                </>
              )}

              {!activeSurvey && !resultsEnabled && (
                <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6 text-center">
                  <p className="text-sm text-[var(--grey-600)]">
                    Results are being prepared. Your consultant will let you know when they&apos;re
                    ready to review.
                  </p>
                </div>
              )}
            </div>

            {/* Right column: latest results with mini compass preview */}
            <div className="flex flex-col gap-5">
              <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
                <h2 className="mb-4 text-base font-semibold text-[var(--grey-900)]">
                  Latest Results
                </h2>
                {/* Mini compass preview placeholder */}
                <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-[var(--grey-200)] bg-white">
                  <p className="text-xs text-[var(--grey-400)]">Compass Preview</p>
                </div>
                {resultsEnabled && activeSurvey && (
                  <button
                    type="button"
                    onClick={() => handleSelectSurvey(activeSurvey.survey.id)}
                    className="mt-4 w-full rounded-lg bg-[#0A3B4F] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    View Full Results
                  </button>
                )}
              </div>
            </div>

            {/* Previous surveys — full width, horizontal scroll on desktop */}
            {previousSurveys.length > 0 && (
              <div className="md:col-span-2">
                <PreviousSurveys surveys={previousSurveys} onSelectSurvey={handleSelectSurvey} />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

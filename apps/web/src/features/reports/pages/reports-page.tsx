/**
 * Reports page — Tier 2 bottom tab at /reports/:surveyId.
 * Lists generated reports grouped by "Available Reports" (active survey)
 * and "Previous Surveys" (completed/closed surveys).
 * Role-based: client_exec can generate, director/manager can download only.
 */

import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useReports } from '../hooks/use-reports';
import { SurveyPicker, type ReportSurveyOption } from '../components/survey-picker';
import { ReportCard } from '../components/report-card';
import { ReportPreview } from '../components/report-preview';
import { ExportModal } from '../components/export-modal';

// ─── Stub: replace with real auth/survey hooks ─────────────────────────────

/** Placeholder role type until auth context is wired */
type UserRole = 'client_exec' | 'director' | 'manager';

interface ReportsPageProps {
  /** Current user role — determines whether "Generate" button appears */
  userRole: UserRole;
  /** Available surveys to pick from */
  surveys: ReportSurveyOption[];
  /** Whether surveys are still loading */
  isSurveysLoading?: boolean;
  /** Initially selected survey ID (from route param) */
  initialSurveyId: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Split surveys into active (current) and previous (completed/closed) */
function groupSurveys(surveys: ReportSurveyOption[]): {
  active: ReportSurveyOption[];
  previous: ReportSurveyOption[];
} {
  const active: ReportSurveyOption[] = [];
  const previous: ReportSurveyOption[] = [];

  for (const survey of surveys) {
    if (survey.status === 'completed' || survey.status === 'closed') {
      previous.push(survey);
    } else {
      // 'active' or undefined (backwards-compatible default)
      active.push(survey);
    }
  }

  return { active, previous };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReportsPage({
  userRole,
  surveys,
  isSurveysLoading = false,
  initialSurveyId,
}: ReportsPageProps): ReactElement {
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(
    initialSurveyId ?? (surveys.length > 0 ? surveys[0]!.id : null),
  );
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  const {
    reports,
    isLoading,
    error,
    refresh,
    selectedReport,
    selectReport,
  } = useReports(activeSurveyId);

  const canGenerate = userRole === 'client_exec';

  const { active, previous } = useMemo(() => groupSurveys(surveys), [surveys]);

  const handleSurveyChange = useCallback((surveyId: string): void => {
    setActiveSurveyId(surveyId);
  }, []);

  const handleGenerated = useCallback((): void => {
    void refresh();
  }, [refresh]);

  // Determine if the currently selected survey is active
  const isActiveSurvey = active.some((s) => s.id === activeSurveyId);

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SurveyPicker
          surveys={surveys}
          activeSurveyId={activeSurveyId}
          onSelect={handleSurveyChange}
          isLoading={isSurveysLoading}
        />

        {canGenerate && activeSurveyId !== null && (
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 rounded-md bg-[var(--color-core)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-core)] focus:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            Generate Report
          </button>
        )}
      </div>

      {/* Error */}
      {error !== null && (
        <div
          role="alert"
          className="rounded-md border border-[var(--severity-critical-border)]/20 bg-[var(--severity-critical-bg)] px-4 py-3 text-sm text-[var(--severity-critical-border)]"
        >
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reports.length === 0 && activeSurveyId !== null && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-6 py-12 text-center">
          <FileText size={40} className="text-[var(--grey-100)]" aria-hidden="true" />
          <p className="text-sm text-[var(--grey-500)]">
            No reports yet. Reports will appear here once your consultant generates them.
          </p>
        </div>
      )}

      {/* No survey selected */}
      {!isLoading && activeSurveyId === null && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-6 py-12 text-center">
          <FileText size={40} className="text-[var(--grey-100)]" aria-hidden="true" />
          <p className="text-sm text-[var(--grey-500)]">
            Select a survey above to view its reports.
          </p>
        </div>
      )}

      {/* Report list + preview: 65/35 split on desktop */}
      {!isLoading && reports.length > 0 && (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Report list — 65% */}
          <div className="flex min-w-0 flex-col gap-6 lg:w-[65%]">
            {/* Active survey reports */}
            {isActiveSurvey && (
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--grey-400)]">
                  Available Reports
                </h2>
                <div role="list" aria-label="Available reports">
                  {reports.map((report) => (
                    <div key={report.id} role="listitem" className="mb-3 last:mb-0">
                      <ReportCard
                        report={report}
                        isSelected={selectedReport?.id === report.id}
                        onSelect={() => selectReport(report)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous survey reports */}
            {!isActiveSurvey && (
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--grey-400)]">
                  Previous Surveys
                </h2>
                <div role="list" aria-label="Previous survey reports">
                  {reports.map((report) => (
                    <div key={report.id} role="listitem" className="mb-3 last:mb-0">
                      <ReportCard
                        report={report}
                        isSelected={selectedReport?.id === report.id}
                        onSelect={() => selectReport(report)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preview panel — 35%, desktop only (stacks below on mobile) */}
          <div className="lg:w-[35%]">
            <ReportPreview report={selectedReport} />
          </div>
        </div>
      )}

      {/* Export modal */}
      {activeSurveyId !== null && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          surveyId={activeSurveyId}
          surveyName={surveys.find((s) => s.id === activeSurveyId)?.title}
          onGenerated={handleGenerated}
        />
      )}
    </div>
  );
}

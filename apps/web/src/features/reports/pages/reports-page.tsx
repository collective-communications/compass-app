/**
 * Reports page — Tier 2 bottom tab at /reports/:surveyId.
 * Lists generated reports for a survey with a 65/35 desktop split (list + preview).
 * Role-based: client_exec can generate, director/manager can download only.
 */

import { useCallback, useState, type ReactElement } from 'react';
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
    remove,
    selectedReport,
    selectReport,
  } = useReports(activeSurveyId);

  const canGenerate = userRole === 'client_exec';
  const canDelete = userRole === 'client_exec';

  const handleSurveyChange = useCallback((surveyId: string): void => {
    setActiveSurveyId(surveyId);
  }, []);

  const handleGenerated = useCallback((): void => {
    void refresh();
  }, [refresh]);

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
            className="flex items-center gap-2 rounded-md bg-[#0A3B4F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0A3B4F]/90 focus:outline-none focus:ring-2 focus:ring-[#0A3B4F] focus:ring-offset-2"
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
          className="rounded-md border border-[#FFCDD2] bg-[#FFF5F5] px-4 py-3 text-sm text-[#D32F2F]"
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
              className="h-20 animate-pulse rounded-lg border border-[#E5E4E0] bg-[#F5F5F5]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reports.length === 0 && activeSurveyId !== null && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[#E5E4E0] bg-white px-6 py-12 text-center">
          <FileText size={40} className="text-[#E5E4E0]" aria-hidden="true" />
          <p className="text-sm text-[#757575]">
            No reports yet. Reports will appear here once your consultant generates them.
          </p>
        </div>
      )}

      {/* No survey selected */}
      {!isLoading && activeSurveyId === null && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[#E5E4E0] bg-white px-6 py-12 text-center">
          <FileText size={40} className="text-[#E5E4E0]" aria-hidden="true" />
          <p className="text-sm text-[#757575]">
            Select a survey above to view its reports.
          </p>
        </div>
      )}

      {/* Report list + preview: 65/35 split on desktop */}
      {!isLoading && reports.length > 0 && (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Report list — 65% */}
          <div
            className="flex min-w-0 flex-col gap-3 lg:w-[65%]"
            role="list"
            aria-label="Generated reports"
          >
            {reports.map((report) => (
              <div key={report.id} role="listitem">
                <ReportCard
                  report={report}
                  isSelected={selectedReport?.id === report.id}
                  onSelect={() => selectReport(report)}
                  onDelete={() => void remove(report.id)}
                  canDelete={canDelete}
                />
              </div>
            ))}
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
          onGenerated={handleGenerated}
        />
      )}
    </div>
  );
}
